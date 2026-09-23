const crypto = require('crypto');
const pool = require('../config/db');
const Settings = require('../models/Settings');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const User = require('../models/User');
const KYC = require('../models/KYC');
const autoRepurchaseService = require('./autoRepurchaseService');
const { isWithinWithdrawalWindow } = require('../utils/time');

// A user may withdraw only after building a minimum team: this many direct
// referrals with an active product.
const MIN_ACTIVE_DIRECTS = 2;

// Withdrawal business logic. User-initiated, min ₹200, 7–10 AM IST window.
// On processing, the requested amount splits:
//   - admin charge  (settings withdrawal_admin_charge_percent, company)
//   - repurchase    (settings repurchase_share_percent, credited to the
//                    user's repurchase wallet, spent by the auto-repurchase
//                    engine on rank upgrades)
//   - payout        (the remainder, paid to the user)
class WithdrawalError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

const round2 = (v) => Math.round(v * 100) / 100;

const withdrawalService = {
  // Split of a withdrawal amount at processing time. The payout is the
  // remainder so rounding never drifts across the three parts.
  computeSplit(amount, settings) {
    const amt = parseFloat(amount);
    const adminCharge = round2(amt * (settings.withdrawal.adminChargePercent || 0) / 100);
    const repurchaseAmount = round2(amt * (settings.withdrawal.repurchaseSharePercent || 0) / 100);
    const payout = round2(amt - adminCharge - repurchaseAmount);
    return { adminCharge, repurchaseAmount, payout };
  },

  // Read-only config for the frontend's withdrawal form preview.
  async getConfig() {
    const settings = await Settings.getIncomeSettings();
    return {
      minAmount: settings.withdrawal.minAmount,
      startTime: settings.withdrawal.startTime,
      endTime: settings.withdrawal.endTime,
      timezone: settings.withdrawal.timezone,
      adminChargePercent: settings.withdrawal.adminChargePercent,
      repurchaseSharePercent: settings.withdrawal.repurchaseSharePercent,
      minActiveDirects: MIN_ACTIVE_DIRECTS,
      autoRepurchaseEnabled: settings.autoRepurchase.enabled
    };
  },
  // User requests a withdrawal. Earnings are held (debited) immediately and
  // restored if the request is rejected or reversed.
  async requestWithdrawal(userId, amount) {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new WithdrawalError(400, 'Invalid withdrawal amount', 'INVALID_AMOUNT');
    }

    const settings = await Settings.getIncomeSettings();
    const { minAmount, startTime, endTime } = settings.withdrawal;

    if (!isWithinWithdrawalWindow(startTime, endTime)) {
      throw new WithdrawalError(
        403,
        `Withdrawals are only accepted between ${startTime} and ${endTime} IST.`,
        'OUTSIDE_WINDOW'
      );
    }
    if (amt < minAmount) {
      throw new WithdrawalError(
        400,
        `Minimum withdrawal amount is ₹${minAmount}.`,
        'BELOW_MINIMUM'
      );
    }

    // Team-building gate: at least MIN_ACTIVE_DIRECTS directs must hold an
    // active product before the user can withdraw.
    const activeDirects = await User.countActiveReferrals(userId);
    if (activeDirects < MIN_ACTIVE_DIRECTS) {
      throw new WithdrawalError(
        403,
        `You need at least ${MIN_ACTIVE_DIRECTS} active direct referrals to withdraw. You have ${activeDirects}.`,
        'INACTIVE_DIRECTS'
      );
    }

    // Bank KYC gate: payouts are sent to the user's bank account, so approved
    // bank KYC is mandatory before any withdrawal request.
    const kyc = await KYC.getByUserId(userId);
    if (!kyc) {
      throw new WithdrawalError(
        403,
        'Please update your bank KYC (Profile → Bank Details) before withdrawing.',
        'KYC_REQUIRED'
      );
    }
    if (kyc.kyc_status === 'pending') {
      throw new WithdrawalError(
        403,
        'Your bank KYC is under review. You can withdraw once it is approved.',
        'KYC_PENDING'
      );
    }
    if (kyc.kyc_status === 'rejected') {
      throw new WithdrawalError(
        403,
        `Your bank KYC was rejected${kyc.rejected_reason ? ': ' + kyc.rejected_reason : ''}. Please update it (Profile → Bank Details).`,
        'KYC_REJECTED'
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [walletRows] = await conn.execute(
        'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      const wallet = walletRows[0];
      if (!wallet) {
        await conn.rollback();
        throw new WithdrawalError(400, 'Wallet not found', 'NO_WALLET');
      }
      if (parseFloat(wallet.earnings_balance) < amt) {
        await conn.rollback();
        throw new WithdrawalError(
          400,
          `Insufficient earnings balance. Available: ₹${wallet.earnings_balance}`,
          'INSUFFICIENT_EARNINGS'
        );
      }
      if (await WithdrawalRequest.hasPending(userId, conn)) {
        await conn.rollback();
        throw new WithdrawalError(
          409,
          'You already have a pending withdrawal request.',
          'PENDING_EXISTS'
        );
      }

      const refKey = `WD-${userId}-${crypto.randomUUID()}`;
      const txId = await WalletTransaction.create({
        user_id: userId,
        type: 'withdrawal',
        amount: -amt,
        status: 'pending',
        reference_key: refKey,
        description: 'Withdrawal request'
      }, conn);

      const reqId = await WithdrawalRequest.create({
        user_id: userId,
        amount: amt,
        reference_key: refKey,
        transaction_id: txId
      }, conn);

      const debited = await Wallet.debitEarnings(userId, amt, conn);
      if (!debited) {
        await conn.rollback();
        throw new WithdrawalError(400, 'Failed to debit earnings. Please try again.', 'DEBIT_FAILED');
      }

      await conn.commit();
      return { id: reqId, amount: amt, status: 'pending', reference_key: refKey };
    } catch (error) {
      try { await conn.rollback(); } catch (_) {}
      throw error;
    } finally {
      conn.release();
    }
  },

  // Admin marks a pending withdrawal as processed (paid out). Records the
  // split ledger, credits the repurchase share, and hands the user to the
  // auto-repurchase engine afterwards (the cron sweep is the recovery path).
  async processWithdrawal(adminId, id) {
    const conn = await pool.getConnection();
    let wr;
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        'SELECT * FROM withdrawal_requests WHERE id = ? FOR UPDATE',
        [id]
      );
      wr = rows[0];
      if (!wr) { await conn.rollback(); throw new WithdrawalError(404, 'Withdrawal not found', 'NOT_FOUND'); }
      if (wr.status !== 'pending') {
        await conn.rollback();
        throw new WithdrawalError(409, `Withdrawal is already ${wr.status}`, 'NOT_PENDING');
      }

      const settings = await Settings.getIncomeSettings();
      const { adminCharge, repurchaseAmount, payout } = this.computeSplit(wr.amount, settings);

      await WithdrawalRequest.updateStatus(id, 'processed', {
        processed_by: adminId,
        processed_at: new Date(),
        admin_charge: adminCharge,
        repurchase_amount: repurchaseAmount,
        payout_amount: payout
      }, conn);
      await WalletTransaction.updateStatus(wr.transaction_id, 'completed');

      // Credit the repurchase share to the user's repurchase wallet.
      if (repurchaseAmount > 0) {
        const repRef = `WRC-${id}`;
        await WalletTransaction.create({
          user_id: wr.user_id,
          type: 'repurchase',
          amount: repurchaseAmount,
          status: 'completed',
          reference_key: repRef,
          description: `Repurchase wallet credit from withdrawal #${id}`
        }, conn);
        await Wallet.addRepurchase(wr.user_id, repurchaseAmount, conn);
      }

      await conn.commit();

      // Fire-and-forget: run the auto-repurchase engine for this user AFTER
      // the commit (never inside this transaction — the engine re-locks the
      // same wallet row). The cron sweep recovers any failure here.
      const userId = wr.user_id;
      setImmediate(() => {
        autoRepurchaseService.processUser(userId, { sourceWithdrawalId: id })
          .catch(err => console.error(`[autoRepurchase] post-withdrawal run failed for user ${userId}:`, err.message));
      });

      return await WithdrawalRequest.getById(id);
    } catch (error) {
      try { await conn.rollback(); } catch (_) {}
      throw error;
    } finally {
      conn.release();
    }
  },

  // Admin rejects a pending withdrawal — earnings restored to the user.
  async rejectWithdrawal(adminId, id, reason) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        'SELECT * FROM withdrawal_requests WHERE id = ? FOR UPDATE',
        [id]
      );
      const wr = rows[0];
      if (!wr) { await conn.rollback(); throw new WithdrawalError(404, 'Withdrawal not found', 'NOT_FOUND'); }
      if (wr.status !== 'pending') {
        await conn.rollback();
        throw new WithdrawalError(409, `Withdrawal is already ${wr.status}`, 'NOT_PENDING');
      }

      await WalletTransaction.updateStatus(wr.transaction_id, 'failed');

      const reversalRef = `WDR-${id}-${crypto.randomUUID()}`;
      const reversalTxId = await WalletTransaction.create({
        user_id: wr.user_id,
        type: 'withdrawal_reversal',
        amount: parseFloat(wr.amount),
        status: 'completed',
        reference_key: reversalRef,
        description: `Withdrawal #${id} rejected${reason ? ': ' + reason : ''}`
      }, conn);

      await Wallet.addEarnings(wr.user_id, parseFloat(wr.amount), conn);

      await WithdrawalRequest.updateStatus(id, 'rejected', {
        processed_by: adminId,
        processed_at: new Date(),
        reject_reason: reason || null,
        reversal_transaction_id: reversalTxId
      }, conn);

      await conn.commit();
      return await WithdrawalRequest.getById(id);
    } catch (error) {
      try { await conn.rollback(); } catch (_) {}
      throw error;
    } finally {
      conn.release();
    }
  },

  // Admin reverses an already-processed withdrawal — claws back the payout,
  // restoring earnings to the user. The repurchase share is clawed back only
  // if it is still sitting in the repurchase wallet; if the auto-repurchase
  // engine already spent it on an upgrade, earnings are still refunded in
  // full and the discrepancy is logged (the upgrade order stands).
  async reverseWithdrawal(adminId, id, reason) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        'SELECT * FROM withdrawal_requests WHERE id = ? FOR UPDATE',
        [id]
      );
      const wr = rows[0];
      if (!wr) { await conn.rollback(); throw new WithdrawalError(404, 'Withdrawal not found', 'NOT_FOUND'); }
      if (wr.status !== 'processed') {
        await conn.rollback();
        throw new WithdrawalError(409, `Only processed withdrawals can be reversed (current: ${wr.status})`, 'NOT_PROCESSED');
      }

      await WalletTransaction.updateStatus(wr.transaction_id, 'failed');

      const reversalRef = `WDR-${id}-${crypto.randomUUID()}`;
      const reversalTxId = await WalletTransaction.create({
        user_id: wr.user_id,
        type: 'withdrawal_reversal',
        amount: parseFloat(wr.amount),
        status: 'completed',
        reference_key: reversalRef,
        description: `Withdrawal #${id} reversed${reason ? ': ' + reason : ''}`
      }, conn);

      await Wallet.addEarnings(wr.user_id, parseFloat(wr.amount), conn);

      // Attempt to claw back the repurchase share.
      const repAmount = parseFloat(wr.repurchase_amount) || 0;
      if (repAmount > 0) {
        const clawedBack = await Wallet.debitRepurchase(wr.user_id, repAmount, conn);
        if (clawedBack) {
          await WalletTransaction.create({
            user_id: wr.user_id,
            type: 'repurchase',
            amount: -repAmount,
            status: 'completed',
            reference_key: `WRCR-${id}`,
            description: `Repurchase wallet claw-back from reversed withdrawal #${id}`
          }, conn);
        } else {
          // Share already spent by the auto-repurchase engine.
          console.warn(`[withdrawalService] reversal #${id}: repurchase share ₹${repAmount} already spent; cannot claw back — earnings refunded in full`);
        }
      }

      await WithdrawalRequest.updateStatus(id, 'reversed', {
        processed_by: adminId,
        processed_at: new Date(),
        reject_reason: reason || null,
        reversal_transaction_id: reversalTxId
      }, conn);

      await conn.commit();
      return await WithdrawalRequest.getById(id);
    } catch (error) {
      try { await conn.rollback(); } catch (_) {}
      throw error;
    } finally {
      conn.release();
    }
  },

  async getMyWithdrawals(userId, page = 1, limit = 20) {
    const rows = await WithdrawalRequest.getByUser(userId, page, limit);
    const total = await WithdrawalRequest.countByUser(userId);
    return {
      withdrawals: rows,
      page, limit, total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  },

  async getAllWithdrawals(page = 1, limit = 20, filters = {}) {
    const rows = await WithdrawalRequest.getAll(page, limit, filters);
    const total = await WithdrawalRequest.countAll(filters);
    return {
      withdrawals: rows,
      page, limit, total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  }
};

module.exports = { withdrawalService, WithdrawalError };