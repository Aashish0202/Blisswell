/**
 * Recover Razorpay product purchases whose payment was CAPTURED by Razorpay
 * but never activated on the site (buyer's browser never completed
 * /verify-and-purchase, so the order stayed 'processing' or was later marked
 * 'failed'/'cancelled' and the user shows as Inactive).
 *
 * For each candidate it asks Razorpay for the order's payments and only
 * settles when a payment is 'captured' and its amount matches the order.
 * Settlement goes through services/razorpayPurchaseService (same code as the
 * webhook and verify endpoint): invoice number, order -> 'pending', user
 * activated + rank, team income to the upline. Safe to re-run: already
 * settled orders are skipped.
 *
 * DRY RUN by default — nothing is written unless --apply is passed.
 *
 *   node scripts/reconcileRazorpayPurchases.js order_XXXX           # check one order
 *   node scripts/reconcileRazorpayPurchases.js order_XXXX --apply   # settle it
 *   node scripts/reconcileRazorpayPurchases.js --scan [--days 30]   # find all stuck ones
 *   node scripts/reconcileRazorpayPurchases.js --scan --apply       # settle all found
 */

require('dotenv').config();
const pool = require('../config/db');
const razorpay = require('../config/razorpay');
const { settleCapturedPurchase } = require('../services/razorpayPurchaseService');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const SCAN = args.includes('--scan');
const daysIdx = args.indexOf('--days');
const DAYS = daysIdx >= 0 ? parseInt(args[daysIdx + 1], 10) : 30;
const orderIds = args.filter((a) => a.startsWith('order_'));

async function findCandidates() {
  const params = [];
  let where = `wt.type = 'purchase'
    AND wt.status <> 'completed'
    AND o.payment_type = 'razorpay'
    AND o.order_number IS NULL
    AND wt.payment_id LIKE 'order\\_%'`;
  if (orderIds.length) {
    where += ` AND wt.payment_id IN (${orderIds.map(() => '?').join(',')})`;
    params.push(...orderIds);
  } else {
    where += ' AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    params.push(DAYS);
  }
  const [rows] = await pool.execute(
    `SELECT wt.payment_id AS rzp_order_id, o.id AS order_id, o.status AS order_status,
            o.amount, o.created_at, u.id AS user_id, u.email, u.referral_code,
            u.has_active_package
     FROM wallet_transactions wt
     JOIN orders o ON o.id = wt.order_id
     JOIN users u ON u.id = o.user_id
     WHERE ${where}
     ORDER BY o.id`,
    params
  );
  return rows;
}

async function main() {
  if (!razorpay) throw new Error('Razorpay keys not configured in .env');
  if (!SCAN && !orderIds.length) {
    console.log('Usage: node scripts/reconcileRazorpayPurchases.js <order_ID ...> | --scan [--days N] [--apply]');
    return;
  }

  console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no changes)'}\n`);

  const candidates = await findCandidates();
  const found = new Set(candidates.map((c) => c.rzp_order_id));
  for (const id of orderIds) {
    if (!found.has(id)) console.log(`${id}: no unsettled purchase order found in DB (already settled, or unknown)`);
  }

  const summary = { settled: 0, would_settle: 0, not_captured: 0, review: 0 };

  for (const c of candidates) {
    const label = `${c.rzp_order_id} | order #${c.order_id} (${c.order_status}) | user ${c.referral_code} ${c.email} | Rs ${c.amount}`;

    let items;
    try {
      ({ items = [] } = await razorpay.orders.fetchPayments(c.rzp_order_id));
    } catch (err) {
      summary.review += 1;
      console.log(`REVIEW ${label} -> Razorpay lookup failed (${err.statusCode || ''} ${err.error?.description || err.message || ''})`);
      continue;
    }
    const captured = items.find((p) => p.status === 'captured');
    if (!captured) {
      summary.not_captured += 1;
      console.log(`SKIP   ${label} -> no captured payment (${items.map((p) => p.status).join(', ') || 'no payments'})`);
      continue;
    }

    const payLabel = `${captured.id}, Rs ${captured.amount / 100}`;
    if (Math.round(parseFloat(c.amount) * 100) !== captured.amount) {
      summary.review += 1;
      console.log(`REVIEW ${label} -> captured ${payLabel} but amount differs from order`);
      continue;
    }
    if (c.has_active_package) {
      summary.review += 1;
      console.log(`REVIEW ${label} -> captured ${payLabel} but user is ALREADY active (duplicate payment? refund in Razorpay)`);
      continue;
    }

    if (!APPLY) {
      summary.would_settle += 1;
      console.log(`READY  ${label} -> captured ${payLabel}; will activate with --apply`);
      continue;
    }

    const result = await settleCapturedPurchase({
      razorpayOrderId: c.rzp_order_id,
      razorpayPaymentId: captured.id,
      amountPaise: captured.amount
    });
    if (result.status === 'settled') {
      summary.settled += 1;
      console.log(`DONE   ${label} -> activated, invoice ${result.invoiceNumber}, rank ${result.product.rank_name}`);
    } else {
      summary.review += 1;
      console.log(`REVIEW ${label} -> ${result.status}`);
    }
  }

  console.log(`\nChecked ${candidates.length} order(s):`, summary);
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
