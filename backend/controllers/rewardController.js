const pool = require('../config/db');
const RewardPlan = require('../models/RewardPlan');
const rewardService = require('../services/rewardService');
const { validateRequiredCounts } = require('../services/rewardLogic');

// ── Member ───────────────────────────────────────────────────────────────

// GET /api/member/rewards
exports.getMyRewards = async (req, res) => {
  try {
    const data = await rewardService.getUserRewards(req.user.id);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('getMyRewards error:', error);
    res.status(500).json({ success: false, message: 'Failed to load rewards' });
  }
};

// ── Admin: plan CRUD ─────────────────────────────────────────────────────

function parsePlanBody(body) {
  const name = String(body.name || '').trim();
  const matrix_label = String(body.matrix_label || '').trim();
  const icon = ['bike', 'car', 'gift', 'trophy', 'home', 'plane'].includes(body.icon) ? body.icon : 'gift';
  if (!name) throw new Error('Name is required');
  if (!matrix_label) throw new Error('Matrix label is required (e.g. 3x3)');
  const required_counts = validateRequiredCounts(body.required_counts);
  const reward_amount = Number(body.reward_amount);
  if (!Number.isFinite(reward_amount) || reward_amount <= 0) throw new Error('Reward amount must be greater than 0');
  const sequence_order = parseInt(body.sequence_order, 10);
  if (!Number.isInteger(sequence_order) || sequence_order < 1) throw new Error('Sequence order must be 1 or more');
  const is_active = body.is_active === undefined ? true : !!body.is_active && body.is_active !== 'false' && body.is_active !== '0';
  return { name, matrix_label, icon, required_counts, reward_amount, sequence_order, is_active };
}

exports.listPlans = async (req, res) => {
  try {
    const plans = await RewardPlan.getAll();
    const [stats] = await pool.query(
      `SELECT reward_plan_id, status, COUNT(*) AS n FROM user_reward_progress GROUP BY reward_plan_id, status`
    );
    const byPlan = {};
    for (const s of stats) {
      byPlan[s.reward_plan_id] = byPlan[s.reward_plan_id] || {};
      byPlan[s.reward_plan_id][s.status] = Number(s.n);
    }
    res.json({ success: true, plans: plans.map(p => ({ ...p, stats: byPlan[p.id] || {} })) });
  } catch (error) {
    console.error('listPlans error:', error);
    res.status(500).json({ success: false, message: 'Failed to load reward plans' });
  }
};

exports.createPlan = async (req, res) => {
  let data;
  try { data = parsePlanBody(req.body); } catch (e) { return res.status(400).json({ success: false, message: e.message }); }
  try {
    const id = await RewardPlan.create(data);
    res.status(201).json({ success: true, plan: await RewardPlan.findById(id) });
  } catch (error) {
    console.error('createPlan error:', error);
    res.status(500).json({ success: false, message: 'Failed to create reward plan' });
  }
};

exports.updatePlan = async (req, res) => {
  let data;
  try { data = parsePlanBody(req.body); } catch (e) { return res.status(400).json({ success: false, message: e.message }); }
  try {
    const existing = await RewardPlan.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Reward plan not found' });
    await RewardPlan.update(existing.id, data);
    // Changed rules apply on the next recompute (daily job / page view /
    // activation). Already-PAID rewards are never touched.
    res.json({ success: true, plan: await RewardPlan.findById(existing.id) });
  } catch (error) {
    console.error('updatePlan error:', error);
    res.status(500).json({ success: false, message: 'Failed to update reward plan' });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const existing = await RewardPlan.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Reward plan not found' });
    const payouts = await RewardPlan.countPayouts(existing.id);
    if (payouts > 0) {
      return res.status(409).json({
        success: false,
        code: 'PLAN_HAS_PAYOUTS',
        message: `This plan has ${payouts} payout(s) and cannot be deleted. Deactivate it instead.`
      });
    }
    await RewardPlan.remove(existing.id);
    res.json({ success: true });
  } catch (error) {
    console.error('deletePlan error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete reward plan' });
  }
};

// ── Admin: report + recompute ───────────────────────────────────────────

exports.getReport = async (req, res) => {
  try {
    const { status, plan_id, search, page, limit } = req.query;
    const data = await rewardService.getReport({ status, planId: plan_id, search, page, limit });
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('rewards report error:', error);
    res.status(500).json({ success: false, message: 'Failed to load rewards report' });
  }
};

// POST /api/admin/rewards/recompute/:user — numeric id or referral code
exports.recomputeUser = async (req, res) => {
  try {
    const key = String(req.params.user || '').trim();
    const [rows] = await pool.execute(
      'SELECT id, name, referral_code FROM users WHERE id = ? OR referral_code = ? LIMIT 1',
      [/^\d+$/.test(key) ? Number(key) : 0, key]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    const result = await rewardService.recomputeUser(rows[0].id);
    res.json({
      success: true,
      user: rows[0],
      counts: result.counts,
      paid: result.paid,
      plans: result.results.map(d => ({ id: d.plan.id, name: d.plan.name, status: d.status, progress_pct: d.progress.progressPct }))
    });
  } catch (error) {
    console.error('recompute user error:', error);
    res.status(500).json({ success: false, message: 'Failed to recompute rewards' });
  }
};

// POST /api/admin/rewards/reconcile — run the daily job now
exports.reconcileAll = async (req, res) => {
  try {
    const summary = await rewardService.reconcileAll();
    res.json({ success: true, summary });
  } catch (error) {
    console.error('reconcile error:', error);
    res.status(500).json({ success: false, message: 'Reconciliation failed' });
  }
};
