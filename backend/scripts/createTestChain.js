/**
 * Test-chain seeder: registers a root user plus one direct downline at each
 * level (L1..L10), then activates them one by one from root to L10 by buying
 * a product from the wallet â€” the same code path as POST /orders/purchase.
 *
 * Usage:
 *   node scripts/createTestChain.js                 (all users buy Platinum)
 *   node scripts/createTestChain.js --product star|silver|gold|platinum|ascending
 *
 * Aborts (without writing anything) if any of the chain emails already exist.
 */

const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Product = require('../models/Product');
const teamIncomeService = require('../services/teamIncomeService');
const { allocateInvoiceNumber } = require('../utils/helpers');

const PASSWORD = 'Test@123';
const SEED_DEPOSIT = 10000; // wallet balance credited to each user before purchase
const EMAIL_DOMAIN = 'bwtest.example.com';
const REF_PREFIX = 'BWT';

const args = process.argv.slice(2);
const productArg = (args.find(a => a.startsWith('--product=')) || '--product=platinum')
  .split('=')[1].toLowerCase();
const VALID = ['star', 'silver', 'gold', 'platinum', 'ascending'];
if (!VALID.includes(productArg)) {
  console.error(`Invalid --product "${productArg}". Use one of: ${VALID.join(', ')}`);
  process.exit(1);
}

// Chain definition: index 0 = root, 1..10 = direct child of the previous.
const chain = [
  { label: 'Root', name: 'BW Test Root', email: `root@${EMAIL_DOMAIN}`, refCode: `${REF_PREFIX}ROOT01`, referredBy: null },
  ...Array.from({ length: 10 }, (_, i) => ({
    label: `L${i + 1}`,
    name: `BW Test L${i + 1}`,
    email: `l${i + 1}@${EMAIL_DOMAIN}`,
    refCode: `${REF_PREFIX}L${String(i + 1).padStart(2, '0')}`,
    referredBy: null // filled after the previous user is created
  }))
];

const RANK_BY_NAME = { star: 1, silver: 2, gold: 3, platinum: 4 };

function pickProductId(rankProducts, index) {
  if (productArg === 'ascending') {
    // Root buys the entry rank, deeper users buy progressively higher ranks
    // (clamped at Platinum) so each rank table gets exercised.
    const rank = Math.min(RANK_BY_NAME.star + index, RANK_BY_NAME.platinum);
    return rankProducts.find(p => p.rank_order === rank);
  }
  const rank = RANK_BY_NAME[productArg];
  return rankProducts.find(p => p.rank_order === rank);
}

async function emailExists(email) {
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  return rows.length > 0;
}

// Wallet purchase â€” mirrors orderController.purchaseProduct step by step so
// income distribution is byte-for-byte identical to a real activation.
async function purchase(userId, product) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);

    // Deduct from wallet (same guarded UPDATE as orderController.purchaseProduct)
    const [deductResult] = await conn.execute(
      'UPDATE wallets SET balance = balance - ?, updated_at = NOW() WHERE user_id = ? AND balance >= ?',
      [product.price, userId, product.price]
    );
    if (deductResult.affectedRows === 0) {
      throw new Error(`Wallet debit failed for user ${userId} (insufficient balance)`);
    }

    const invoiceNumber = await allocateInvoiceNumber(conn);
    const [orderResult] = await conn.execute(
      `INSERT INTO orders (user_id, product_id, amount, payment_type, status, order_number)
       VALUES (?, ?, ?, 'wallet', 'delivered', ?)`,
      [userId, product.id, product.price, invoiceNumber]
    );
    const orderId = orderResult.insertId;

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
      purchaserId: userId,
      orderId,
      product
    });

    await conn.commit();
    return { orderId, credited };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

(async () => {
  // ---- Preflight: refuse to run if any chain user already exists ----
  for (const member of chain) {
    if (await emailExists(member.email)) {
      console.error(`âœ— User already exists: ${member.email}. Chain not created.`);
      process.exit(1);
    }
  }
  const codes = chain.map(c => c.refCode);
  const [codeRows] = await pool.execute(
    `SELECT referral_code FROM users WHERE referral_code IN (${codes.map(() => '?').join(',')})`,
    codes
  );
  if (codeRows.length > 0) {
    console.error(`âœ— Referral code(s) already taken: ${codeRows.map(r => r.referral_code).join(', ')}`);
    process.exit(1);
  }

  const rankProducts = await Product.getActiveRanks(pool);
  if (!rankProducts || rankProducts.length === 0) {
    console.error('âœ— No active rank products found.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const created = [];

  for (const [index, member] of chain.entries()) {
    // Resolve referrer from the previously created member
    member.referredBy = index === 0 ? null : created[index - 1].id;

    const userId = await User.create({
      name: member.name,
      email: member.email,
      mobile: `9000000${String(index).padStart(3, '0')}`,
      state: 'Maharashtra',
      address: 'Test Chain Address, Nashik',
      password: passwordHash,
      pan_number: `AAACP${String(1000 + index).slice(-4)}Q`,
      referral_code: member.refCode,
      referred_by: member.referredBy
    });
    await pool.execute('UPDATE users SET pan_status = "approved" WHERE id = ?', [userId]);
    await Wallet.create(userId);
    await pool.execute(
      'UPDATE wallets SET balance = balance + ? WHERE user_id = ?',
      [SEED_DEPOSIT, userId]
    );
    await pool.execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, status, payment_id, description)
       VALUES (?, 'deposit', ?, 'completed', ?, ?)`,
      [userId, SEED_DEPOSIT, `TESTSEED-${userId}`, 'Test chain seed deposit']
    );
    created.push({ ...member, id: userId });

    // Activate: root first, then L1..L10 in order
    // (getActiveRanks returns raw rows; getById parses level_income into an array)
    const picked = pickProductId(rankProducts, index);
    if (!picked) {
      console.error(`âœ— No product found for rank selection (index ${index}). Aborting.`);
      process.exit(1);
    }
    const product = await Product.getById(picked.id);
    const { orderId, credited } = await purchase(userId, product);

    const uplineStr = credited.length
      ? credited.map(c => `${c.upline_id}:+â‚¹${c.amount}(L${c.level})`).join(', ')
      : '(no upline â€” first purchase)';
    console.log(`âœ“ ${member.label.padEnd(5)} id=${String(userId).padEnd(3)} bought ${product.rank_name} (order #${orderId}) â†’ income: ${uplineStr}`);
  }

  // ---- Summary ----
  console.log('\n================ TEST CHAIN CREATED ================');
  console.log(`Password for every account: ${PASSWORD}`);
  console.log(`Wallet seed deposit: â‚¹${SEED_DEPOSIT} each\n`);
  for (const u of created) {
    const [w] = await pool.execute('SELECT balance, earnings_balance FROM wallets WHERE user_id = ?', [u.id]);
    const [r] = await pool.execute('SELECT rank_name, referral_code FROM users WHERE id = ?', [u.id]);
    console.log(
      `${u.label.padEnd(5)} ${r[0].referral_code.padEnd(10)} rank=${(r[0].rank_name || '-').padEnd(9)} ` +
      `wallet=â‚¹${w[0].balance}  earnings=â‚¹${w[0].earnings_balance}  ${u.email}`
    );
  }
  console.log('\nLogin: use the email + password on the normal login page (admin uses ADMIN001).');
  console.log('Chain: Root â†’ L1 â†’ ... â†’ L10, each referred by the one above it.');
  process.exit(0);
})().catch(err => {
  console.error('âœ— Seed failed:', err);
  process.exit(1);
});