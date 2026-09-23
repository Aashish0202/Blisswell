/**
 * Auto-repurchase test setup: creates one Star-rank user under the chain root
 * and injects a configurable repurchase balance so the auto-upgrade engine
 * can be triggered (POST /admin/auto-repurchase/run, cron, or a withdrawal).
 *
 * Usage: node scripts/createAutoRepurchaseTest.js [repurchaseAmount]
 *   default repurchaseAmount = 7100 (covers Starâ†’Silverâ†’Goldâ†’Platinum cascade)
 *
 * Aborts without writing if the test user already exists.
 */

const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const Wallet = require('../models/Wallet');
const Product = require('../models/Product');
const teamIncomeService = require('../services/teamIncomeService');
const { allocateInvoiceNumber } = require('../utils/helpers');

const PASSWORD = 'Test@123';
const EMAIL = 'reptest@bwtest.example.com';
const REF_CODE = 'BWTRPT01';
const SEED_DEPOSIT = 1000; // enough for the Star (â‚¹349) purchase from wallet balance
const STAR_PRICE = 349;

const repurchaseAmount = parseFloat(process.argv[2]) || 7100;

async function purchase(userId, product) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);
    const [deduct] = await conn.execute(
      'UPDATE wallets SET balance = balance - ?, updated_at = NOW() WHERE user_id = ? AND balance >= ?',
      [product.price, userId, product.price]
    );
    if (deduct.affectedRows === 0) throw new Error('Wallet debit failed');
    const invoiceNumber = await allocateInvoiceNumber(conn);
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, 'wallet', 'delivered', ?)`,
      [userId, product.id, product.price, invoiceNumber]
    );
    await conn.execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, description)
       VALUES (?, 'purchase', ?, 'completed', ?)`,
      [userId, -product.price, `Purchase: ${product.name}`]
    );
    await conn.execute(
      'UPDATE users SET has_active_package = TRUE, rank_name = ?, current_product_id = ?, updated_at = NOW() WHERE id = ?',
      [product.rank_name, product.id, userId]
    );
    const credited = await teamIncomeService.distributeForPurchase(conn, {
      purchaserId: userId, orderId: orderResult.insertId, product
    });
    await conn.commit();
    return { orderId: orderResult.insertId, credited };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

(async () => {
  const [exists] = await pool.execute('SELECT id FROM users WHERE email = ?', [EMAIL]);
  if (exists.length > 0) {
    console.error(`âœ— Test user already exists: ${EMAIL}`);
    process.exit(1);
  }
  const [code] = await pool.execute('SELECT id FROM users WHERE referral_code = ?', [REF_CODE]);
  if (code.length > 0) {
    console.error(`âœ— Referral code already taken: ${REF_CODE}`);
    process.exit(1);
  }

  // Chain root is the referrer so the upgrades pay income up the chain
  const [rootRows] = await pool.execute('SELECT id FROM users WHERE referral_code = ?', ['BWTROOT01']);
  if (rootRows.length === 0) {
    console.error('âœ— Chain root (BWTROOT01) not found â€” create the test chain first.');
    process.exit(1);
  }
  const rootId = rootRows[0].id;

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const userId = await pool.execute(
    `INSERT INTO users (name, email, mobile, state, address, password, pan_number, referral_code, referred_by, pan_status)
     VALUES ('BW Repurchase Test', ?, '9000000999', 'Maharashtra', 'Test Chain Address, Nashik', ?, 'AAACP9999Q', ?, ?, 'approved')`,
    [EMAIL, passwordHash, REF_CODE, rootId]
  ).then(([r]) => r.insertId);
  await Wallet.create(userId);
  await pool.execute('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [SEED_DEPOSIT, userId]);
  await pool.execute(
    `INSERT INTO wallet_transactions (user_id, type, amount, status, payment_id, description)
     VALUES (?, 'deposit', ?, 'completed', ?, 'Repurchase-test seed deposit')`,
    [userId, SEED_DEPOSIT, `TESTSEED-RP-${userId}`]
  );

  const star = await Product.getById(1);
  const { orderId, credited } = await purchase(userId, star);
  const uplineStr = credited.map(c => `${c.upline_id}:+â‚¹${c.amount}(L${c.level})`).join(', ') || '(none)';
  console.log(`âœ“ Repurchase test user id=${userId} bought Star (order #${orderId}) â†’ income: ${uplineStr}`);

  // Inject repurchase balance (test shortcut â€” the real funding source is the
  // 20% split of processed withdrawals; a real end-to-end run would need many
  // withdrawal cycles to reach the next tier's price).
  await pool.execute('UPDATE wallets SET repurchase_balance = ? WHERE user_id = ?', [repurchaseAmount, userId]);
  const [w] = await pool.execute('SELECT balance, earnings_balance, repurchase_balance FROM wallets WHERE user_id = ?', [userId]);
  const [u] = await pool.execute('SELECT rank_name FROM users WHERE id = ?', [userId]);
  console.log(`\n================ AUTO-REPURCHASE TEST READY ================`);
  console.log(`User:   ${EMAIL}  (ref ${REF_CODE}, password ${PASSWORD})`);
  console.log(`Rank:   ${u[0].rank_name}   wallet=â‚¹${w[0].balance}  earnings=â‚¹${w[0].earnings_balance}  repurchase=â‚¹${w[0].repurchase_balance}`);
  console.log(`Upline: root user id=${rootId} (BWTROOT01) â€” watch their earnings_balance grow on each upgrade.`);
  console.log(`\nTrigger now:  POST /admin/auto-repurchase/run  (or wait for the :3 cron sweep)`);
  console.log(`Watch:        rank ${u[0].rank_name} â†’ Silver(â‚¹849) â†’ Gold(â‚¹1,749) â†’ Platinum(â‚¹4,449) while â‚¹${repurchaseAmount} lasts.`);
  process.exit(0);
})().catch(err => {
  console.error('âœ— Setup failed:', err);
  process.exit(1);
});