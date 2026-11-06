const pool = require('../config/db');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const RewardPlan = require('../models/RewardPlan');
const { LEVELS, STATUS, evaluatePlans, buildCountsMap, countsFromLevelRows, normalizeCounts } = require('./rewardLogic');

// Milestone Rewards engine (Bike Fund 3x3 / Car Fund 5x5).
//
// Counting uses recursive CTEs over users.referred_by (the existing sponsor
// tree; indexed by idx on referred_by+has_active_package) — one query per
// user, or one query for EVERY user in the daily reconciliation. No N+1.
//
// Payout idempotency is enforced twice:
//   1. user_reward_progress UNIQUE(user_id, reward_plan_id), row locked
//      FOR UPDATE for the whole recompute transaction; PAID is terminal.
//   2. wallet_transactions.reference_key UNIQUE = 'RW-{userId}-{planId}' —
//      a second credit for the same user+plan is impossible at the DB level.
// Rewards credit wallets.earnings_balance (withdrawable, like level income).

const refKeyFor = (userId, planId) => `RW-${userId}-${planId}`;
const rewardLabel = (plan) => `${plan.name} Reward`;

// Active members per level (1..6) in one user's downline.
async function getLevelCounts(userId, connection = pool) {
  const [rows] = await connection.query(
    `WITH RECURSIVE downline AS (
       SELECT id, has_active_package, 1 AS level FROM users WHERE referred_by = ?
       UNION ALL
       SELECT u.id, u.has_active_package, d.level + 1
         FROM users u JOIN downline d ON u.referred_by = d.id
        WHERE d.level < ${LEVELS}
     )
     SELECT level, SUM(CASE WHEN has_active_package = 1 THEN 1 ELSE 0 END) AS cnt
       FROM downline GROUP BY level`,
    [userId]
  );
  return countsFromLevelRows(rows);
}

// Active-member level counts for every ancestor in one pass: each ACTIVE
// member walks up ≤6 sponsors. Returns Map<userId, number[6]>.
async function getAllLevelCounts(connection = pool) {
  const [rows] = await connection.query(
    `WITH RECURSIVE anc AS (
       SELECT referred_by AS ancestor_id, 1 AS depth
         FROM users WHERE has_active_package = 1 AND referred_by IS NOT NULL
       UNION ALL
       SELECT p.referred_by, a.depth + 1
         FROM anc a JOIN users p ON p.id = a.ancestor_id
        WHERE a.depth < ${LEVELS} AND p.referred_by IS NOT NULL
     )
     SELECT ancestor_id, depth, COUNT(*) AS cnt FROM anc GROUP BY ancestor_id, depth`
  );
  return buildCountsMap(rows);
}

// Recompute (and pay, if due) every plan for one user, in its own DB
// transaction. Safe to call any number of times, concurrently.
//   opts.counts — precomputed level counts (bulk job); else counted here
//   opts.plans  — preloaded active plans
async function recomputeUser(userId, opts = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await recomputeUserOnce(userId, opts);
    } catch (err) {
      const retryable = err.code === 'ER_LOCK_DEADLOCK' || err.code === 'ER_LOCK_WAIT_TIMEOUT';
      if (!retryable || attempt >= 3) throw err;
      await new Promise(r => setTimeout(r, 50 * attempt));
    }
  }
}

async function recomputeUserOnce(userId, opts = {}) {
  const plans = opts.plans || await RewardPlan.getActive();
  const counts = opts.counts ? normalizeCounts(opts.counts) : await getLevelCounts(userId);
  if (plans.length === 0) return { userId, counts, results: [], paid: [] };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[user]] = await connection.execute(
      'SELECT id, role, is_active, has_active_package FROM users WHERE id = ?',
      [userId]
    );
    if (!user) { await connection.rollback(); return null; }
    if (user.role === 'admin') {
      // Admins can view progress but never get progress rows or payouts.
      await connection.rollback();
      return { userId, counts, eligible: false, results: evaluatePlans(plans, counts, {}, false), paid: [] };
    }
    const eligible = !!user.has_active_package && user.role !== 'admin' && user.is_active !== 0;

    // Make sure a row exists per plan, then lock them all.
    for (const plan of plans) {
      await connection.execute(
        `INSERT IGNORE INTO user_reward_progress (user_id, reward_plan_id, level_counts, status)
         VALUES (?, ?, '[0,0,0,0,0,0]', 'IN_PROGRESS')`,
        [userId, plan.id]
      );
    }
    const [rows] = await connection.query(
      `SELECT * FROM user_reward_progress WHERE user_id = ? AND reward_plan_id IN (?) FOR UPDATE`,
      [userId, plans.map(p => p.id)]
    );
    const existing = {};
    for (const r of rows) existing[r.reward_plan_id] = r;

    const decisions = evaluatePlans(plans, counts, existing, eligible);
    const paid = [];

    for (const d of decisions) {
      const row = existing[d.plan.id];
      let transactionId = row.transaction_id || null;
      let achievedAt = row.achieved_at || null;
      let paidAt = row.paid_at || null;
      let rewardAmount = row.reward_amount != null ? row.reward_amount : null;

      if (d.pay) {
        // ACHIEVED → credit → PAID, atomically inside this transaction.
        const refKey = refKeyFor(userId, d.plan.id);
        const prior = await WalletTransaction.getByReferenceKey(refKey, connection);
        if (prior) {
          transactionId = prior.id; // already credited earlier (self-heal row)
        } else {
          transactionId = await WalletTransaction.create({
            user_id: userId,
            type: 'reward',
            amount: d.plan.reward_amount,
            status: 'completed',
            reference_key: refKey,
            order_id: String(row.id), // reference_id = user_reward_progress.id
            description: rewardLabel(d.plan)
          }, connection);
          const credited = await Wallet.addEarnings(userId, d.plan.reward_amount, connection);
          if (!credited) throw new Error(`Wallet not found for user ${userId}`);
          paid.push({ planId: d.plan.id, name: d.plan.name, amount: d.plan.reward_amount, transactionId });
        }
        achievedAt = achievedAt || new Date();
        paidAt = paidAt || new Date();
        rewardAmount = d.plan.reward_amount;
      }

      await connection.execute(
        `UPDATE user_reward_progress
            SET level_counts = ?, progress_pct = ?, status = ?, reward_amount = ?,
                achieved_at = ?, paid_at = ?, transaction_id = ?, last_computed_at = NOW()
          WHERE id = ?`,
        [JSON.stringify(counts), d.progress.progressPct, d.status, rewardAmount,
         achievedAt, paidAt, transactionId, row.id]
      );
      d.row = { ...row, status: d.status, achieved_at: achievedAt, paid_at: paidAt, transaction_id: transactionId, reward_amount: rewardAmount };
    }

    await connection.commit();
    if (paid.length) {
      console.log(`[rewards] user ${userId} paid: ${paid.map(p => `${p.name} ₹${p.amount} (tx ${p.transactionId})`).join(', ')}`);
    }
    return { userId, counts, eligible, results: decisions, paid };
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    throw error;
  } finally {
    connection.release();
  }
}

// Called after a member's activation has COMMITTED. Recomputes the member
// and their 6 uplines. Never throws — the daily reconciliation is the
// backstop for anything that fails here.
async function onMemberActivated(userId) {
  try {
    const plans = await RewardPlan.getActive();
    if (plans.length === 0) return;
    const upline = await User.getUpline(userId, LEVELS);
    const ids = [userId, ...upline.map(n => n.id)];
    for (const id of ids) {
      try {
        await recomputeUser(id, { plans });
      } catch (err) {
        console.error(`[rewards] recompute failed for user ${id}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[rewards] onMemberActivated(${userId}) failed:`, err.message);
  }
}

// Fire-and-forget wrapper for payment paths.
function scheduleActivation(userId) {
  setImmediate(() => { onMemberActivated(userId); });
}

// Daily reconciliation: recompute everyone with downline activity or an
// existing progress row. Backfills missed payouts; idempotent.
async function reconcileAll() {
  const started = Date.now();
  const plans = await RewardPlan.getActive();
  if (plans.length === 0) return { users: 0, paid: 0, errors: 0 };

  const countsMap = await getAllLevelCounts();
  const [progressUsers] = await pool.query('SELECT DISTINCT user_id FROM user_reward_progress');
  const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
  const adminIds = new Set(admins.map(r => r.id));
  const ids = new Set([...countsMap.keys(), ...progressUsers.map(r => r.user_id)].filter(id => !adminIds.has(id)));

  let paid = 0;
  let errors = 0;
  for (const id of ids) {
    try {
      const res = await recomputeUser(id, { plans, counts: countsMap.get(id) || new Array(LEVELS).fill(0) });
      if (res) paid += res.paid.length;
    } catch (err) {
      errors++;
      console.error(`[rewards] reconcile failed for user ${id}:`, err.message);
    }
  }
  const summary = { users: ids.size, paid, errors, ms: Date.now() - started };
  console.log(`[rewards] reconciliation done: ${JSON.stringify(summary)}`);
  return summary;
}

// Data for GET /api/member/rewards. Recomputes first (idempotent), so the
// page is always current even if a background recompute was missed.
async function getUserRewards(userId) {
  const res = await recomputeUser(userId);
  const counts = res ? res.counts : await getLevelCounts(userId);
  const results = res ? res.results : [];

  return {
    userActive: res ? !!res.eligible : false,
    levels: counts.map((active, i) => ({ level: i + 1, active })),
    totalActive: counts.reduce((a, b) => a + b, 0),
    plans: results.map(d => ({
      id: d.plan.id,
      name: d.plan.name,
      label: rewardLabel(d.plan),
      matrix_label: d.plan.matrix_label,
      icon: d.plan.icon,
      reward_amount: d.plan.reward_amount,
      sequence_order: d.plan.sequence_order,
      status: d.status,
      progress_pct: d.progress.progressPct,
      achieved_total: d.progress.achievedTotal,
      required_total: d.progress.requiredTotal,
      levels: d.progress.levels,
      awaiting_activation: d.awaitingActivation,
      achieved_at: d.row?.achieved_at || null,
      paid_at: d.row?.paid_at || null,
      transaction_id: d.row?.transaction_id || null,
      paid_amount: d.row?.reward_amount != null ? parseFloat(d.row.reward_amount) : null
    }))
  };
}

// Admin report: users per reward plan with status/date/transaction.
async function getReport({ status = '', planId = '', search = '', page = 1, limit = 20 } = {}) {
  const where = ["u.role <> 'admin'"];
  const params = [];
  if (status && Object.values(STATUS).includes(status)) { where.push('p.status = ?'); params.push(status); }
  if (planId) { where.push('p.reward_plan_id = ?'); params.push(Number(planId)); }
  if (search) {
    where.push('(u.name LIKE ? OR u.referral_code LIKE ? OR u.mobile LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  const whereSql = where.join(' AND ');
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;

  const [rows] = await pool.query(
    `SELECT p.id, p.user_id, u.name AS user_name, u.referral_code, u.mobile,
            p.reward_plan_id, rp.name AS plan_name, rp.matrix_label, rp.reward_amount AS plan_amount,
            p.status, p.progress_pct, p.level_counts, p.reward_amount, p.achieved_at, p.paid_at,
            p.transaction_id, p.last_computed_at
       FROM user_reward_progress p
       JOIN users u ON u.id = p.user_id
       JOIN reward_plans rp ON rp.id = p.reward_plan_id
      WHERE ${whereSql}
      ORDER BY FIELD(p.status,'PAID','ACHIEVED','IN_PROGRESS','LOCKED'), p.progress_pct DESC, p.id DESC
      LIMIT ${lim} OFFSET ${offset}`,
    params
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM user_reward_progress p JOIN users u ON u.id = p.user_id WHERE ${whereSql}`,
    params
  );
  const [summary] = await pool.query(
    `SELECT rp.id AS plan_id, rp.name, rp.matrix_label, p.status, COUNT(*) AS n,
            COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.reward_amount ELSE 0 END), 0) AS paid_total
       FROM user_reward_progress p JOIN reward_plans rp ON rp.id = p.reward_plan_id
       JOIN users u ON u.id = p.user_id AND u.role <> 'admin'
      GROUP BY rp.id, p.status ORDER BY rp.sequence_order`
  );

  return {
    rows: rows.map(r => ({
      ...r,
      level_counts: normalizeCounts(r.level_counts),
      progress_pct: parseFloat(r.progress_pct) || 0,
      reward_amount: r.reward_amount != null ? parseFloat(r.reward_amount) : null,
      plan_amount: parseFloat(r.plan_amount) || 0
    })),
    total: Number(total) || 0,
    page: Math.max(parseInt(page, 10) || 1, 1),
    totalPages: Math.max(Math.ceil((Number(total) || 0) / lim), 1),
    summary: summary.map(s => ({ ...s, n: Number(s.n), paid_total: parseFloat(s.paid_total) || 0 }))
  };
}

module.exports = {
  refKeyFor,
  rewardLabel,
  getLevelCounts,
  getAllLevelCounts,
  recomputeUser,
  onMemberActivated,
  scheduleActivation,
  reconcileAll,
  getUserRewards,
  getReport
};
