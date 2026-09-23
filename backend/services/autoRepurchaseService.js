const pool = require('../config/db');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Product = require('../models/Product');
const teamIncomeService = require('./teamIncomeService');
const { allocateInvoiceNumber } = require('../utils/helpers');

// Auto-Repurchase engine (rank upgrade system).
//
// When a user's repurchase wallet (fed by the 20% share of processed
// withdrawals) can afford the NEXT HIGHER-priced active product above their
// current one, the system buys it: debits the repurchase wallet, creates a
// 'delivered' order (order_source='auto_repurchase'), updates the user's
// rank/current product, and distributes that rank's level income to the
// upline — but never creates a cashback entitlement (cashback was removed
// from the income model; only manual purchases ever earned it).
//
// At the top rank (no higher product yet) the balance simply accumulates;
// new higher packages added later are picked up automatically.
//
// Race safety: every step runs in a transaction after locking the user row
// and the wallet row FOR UPDATE; a unique reference key
// (`AR-{userId}-{productId}`) makes each upgrade idempotent — rank only
// ascends, so one auto order per user per product, ever.
const MAX_CASCADE_STEPS = 10; // hard cap: Star→…→top tier can't need more

const autoRepurchaseService = {
  // Process one user's repurchase wallet: upgrade while affordable.
  // Returns the list of orders created in this call.
  async processUser(userId, { sourceWithdrawalId = null } = {}) {
    const created = [];

    for (let step = 0; step < MAX_CASCADE_STEPS; step++) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // Lock user row, then wallet row (consistent order avoids deadlocks
        // with the withdrawal flow, which locks the wallet first).
        await conn.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
        const [walletRows] = await conn.execute(
          'SELECT repurchase_balance FROM wallets WHERE user_id = ? FOR UPDATE',
          [userId]
        );
        const wallet = walletRows[0];
        if (!wallet) { await conn.commit(); break; }

        // Re-read state AFTER locks.
        const [userRows] = await conn.execute(
          'SELECT id, has_active_package, current_product_id FROM users WHERE id = ?',
          [userId]
        );
        const user = userRows[0];
        if (!user || !user.has_active_package || !user.current_product_id) {
          await conn.commit();
          break;
        }

        const settings = await Settings.getIncomeSettings(conn);
        if (!settings.autoRepurchase.enabled) {
          await conn.commit();
          break;
        }

        const next = await Product.getNextHigherProduct(user.current_product_id, conn);
        if (!next) { await conn.commit(); break; } // top rank — balance accumulates

        const balance = parseFloat(wallet.repurchase_balance);
        const price = parseFloat(next.price);
        if (balance < price) {
          await conn.commit();
          break;
        }

        // Idempotency: one auto-repurchase per user per product, ever.
        const refKey = `AR-${userId}-${next.id}`;
        const existing = await WalletTransaction.getByReferenceKey(refKey, conn);
        if (existing) { await conn.commit(); break; }

        const debited = await Wallet.debitRepurchase(userId, price, conn);
        if (!debited) {
          // Balance moved under a concurrent runner — retry on a fresh read.
          await conn.rollback();
          continue;
        }

        // Order (instantly delivered — the repurchase wallet is debited here,
        // so the invoice number is allocated in this same confirmed transaction).
        const invoiceNumber = await allocateInvoiceNumber(conn);
        const [orderResult] = await conn.execute(
          `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_source, source_withdrawal_id, order_number)
           VALUES (?, ?, ?, 'repurchase_wallet', 'delivered', 'auto_repurchase', ?, ?)`,
          [userId, next.id, price, sourceWithdrawalId, invoiceNumber]
        );
        const orderId = orderResult.insertId;

        await WalletTransaction.create({
          user_id: userId,
          type: 'repurchase',
          amount: -price,
          order_id: orderId,
          status: 'completed',
          reference_key: refKey,
          description: `Auto repurchase: ${next.rank_name} (${next.name})`
        }, conn);

        await User.updateRank(userId, { rank_name: next.rank_name, product_id: next.id }, conn);

        // New rank's level income flows to the upline (idempotent).
        await teamIncomeService.distributeForPurchase(conn, {
          purchaserId: userId,
          orderId,
          product: next
        });

        await conn.commit();
        created.push({ order_id: orderId, product: next.name, rank: next.rank_name, price });
        // loop continues → cascade while balance affords the next tier
      } catch (error) {
        try { await conn.rollback(); } catch (_) {}
        if (error.code === 'ER_DUP_ENTRY') {
          // Another runner completed this upgrade concurrently.
          break;
        }
        throw error;
      } finally {
        conn.release();
      }
    }

    return created;
  },

  // Cron safety net: find every user whose repurchase balance can afford
  // their next upgrade and run the engine for them, sequentially.
  async sweep() {
    const [rows] = await pool.execute(
      `SELECT u.id, u.current_product_id, w.repurchase_balance
       FROM users u
       JOIN wallets w ON w.user_id = u.id
       WHERE u.role = 'user'
         AND u.has_active_package = 1
         AND u.current_product_id IS NOT NULL
         AND w.repurchase_balance > 0`
    );

    const processed = [];
    for (const row of rows) {
      try {
        const next = await Product.getNextHigherProduct(row.current_product_id);
        if (!next) continue; // top rank
        if (parseFloat(row.repurchase_balance) < parseFloat(next.price)) continue;

        const created = await this.processUser(row.id);
        if (created.length > 0) processed.push({ user_id: row.id, upgrades: created });
      } catch (err) {
        console.error(`[autoRepurchase] sweep failed for user ${row.id}:`, err.message);
      }
    }
    return processed;
  }
};

module.exports = autoRepurchaseService;