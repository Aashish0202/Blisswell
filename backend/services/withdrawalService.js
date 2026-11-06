const crypto = require('crypto');
const pool = require('../config/db');
const Settings = require('../models/Settings');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const User = require('../models/User');
const KYC = require('../models/KYC');
const { isWithinWithdrawalWindow, isWithdrawalDay, WITHDRAWAL_WEEKDAY, DAY_NAMES } = require('../utils/time');

const WITHDRAWAL_DAY_NAME = DAY_NAMES[WITHDRAWAL_WEEKDAY];

// A user may withdraw only after building a minimum team: this many direct
// referrals with an active product.
const MIN_ACTIVE_DIRECTS = 2;

// Withdrawal business logic. User-initiated, min ₹200, Fridays only within
// the admin-set time window (default 7–10 AM IST).
// On processing, the requested amount splits:
//   - admin charge  (settings withdrawal_admin_charge_percent, company)
//   - payout        (the remainder, paid to the user)
// The repurchase-wallet share was retired; repurchase_amount is recorded
// as 0 on new withdrawals and kept only for legacy rows.
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
  // remainder so rounding never drifts.
  computeSplit(amount, settings) {
    const amt = parseFloat(amount);
    const adminCharge = round2(amt * (settings.withdrawal.adminChargePercent || 0) / 100);
    const payout = round2(amt - adminCharge);
    return { adminCharge, payout };
  },

  // Read-only config for the frontend's withdrawal form preview.
  async getConfig() {
    const settings = await Settings.getIncomeSettings();
    return {
      minAmount: settings.withdrawal.minAmount,
      startTime: settings.withdrawal.startTime,
      endTime: settings.withdrawal.endTime,
      timezone: settings.withdrawal.timezone,
      weekday: WITHDRAWAL_WEEKDAY,
      dayName: WITHDRAWAL_DAY_NAME,
      // Server-computed so the client never trusts its own clock/timezone.
      isOpenNow: isWithdrawalDay() && isWithinWithdrawalWindow(settings.withdrawal.startTime, settings.withdrawal.endTime),
      adminChargePercent: settings.withdrawal.adminChargePercent,
      minActiveDirects: MIN_ACTIVE_DIRECTS
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

    if (!isWithdrawalDay()) {
      throw new WithdrawalError(
        403,
        `Withdrawals are only accepted on ${WITHDRAWAL_DAY_NAME}, between ${startTime} and ${endTime} IST.`,
        'OUTSIDE_DAY'
      );
    }
    if (!isWithinWithdrawalWindow(startTime, endTime)) {
      throw new WithdrawalError(
        403,
        `Withdrawals are only accepted on ${WITHDRAWAL_DAY_NAME}, between ${startTime} and ${endTime} IST.`,
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

  // Admin marks a pending withdrawal as processed (paid out) and records
  // the admin-charge / payout split ledger.
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
      const { adminCharge, payout } = this.computeSplit(wr.amount, settings);

      await WithdrawalRequest.updateStatus(id, 'processed', {
        processed_by: adminId,
        processed_at: new Date(),
        admin_charge: adminCharge,
        repurchase_amount: 0,
        payout_amount: payout
      }, conn);
      await WalletTransaction.updateStatus(wr.transaction_id, 'completed');

      await conn.commit();

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