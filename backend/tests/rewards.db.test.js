// Integration test against the LOCAL test database (never prod).
// Opt-in:  RUN_DB_TESTS=1 npx jest tests/rewards.db.test.js
// Builds a real 3-ary sponsor tree 6 levels deep (1,092 active members) under
// a test root, using throwaway plan ids so real plans/progress are untouched,
// then cleans everything up.
const RUN = process.env.RUN_DB_TESTS === '1';
const d = RUN ? describe : describe.skip;

d('milestone rewards — DB integration', () => {
  let pool, rewardService, RewardPlan;
  const PREFIX = 'RWT';
  const PLANS = [
    { id: 990001, name: 'Bike Fund', matrix_label: '3x3', icon: 'bike', sequence_order: 1, reward_amount: 100000, required_counts: [3, 9, 27, 81, 243, 729], is_active: true },
    { id: 990002, name: 'Car Fund', matrix_label: '5x5', icon: 'car', sequence_order: 2, reward_amount: 900000, required_counts: [5, 25, 125, 625, 3125, 15625], is_active: true }
  ];
  let rootId;

  async function cleanup() {
    const [ids] = await pool.query(`SELECT id FROM users WHERE referral_code LIKE '${PREFIX}%'`);
    const list = ids.map(r => r.id);
    if (list.length) {
      await pool.query('DELETE FROM wallet_transactions WHERE user_id IN (?)', [list]);
      await pool.query('DELETE FROM user_reward_progress WHERE user_id IN (?)', [list]);
      await pool.query('DELETE FROM wallets WHERE user_id IN (?)', [list]);
      await pool.query('UPDATE users SET referred_by = NULL WHERE id IN (?)', [list]);
      await pool.query('DELETE FROM users WHERE id IN (?)', [list]);
    }
    await pool.query('DELETE FROM user_reward_progress WHERE reward_plan_id IN (990001, 990002)');
  }

  beforeAll(async () => {
    pool = require('../config/db');
    RewardPlan = require('../models/RewardPlan');
    rewardService = require('../services/rewardService');
    if (process.env.DB_HOST && !['localhost', '127.0.0.1'].includes(process.env.DB_HOST)) {
      throw new Error('Refusing to run DB tests against a non-local database');
    }
    await RewardPlan.ensureSchema();
    await cleanup();

    let seq = 0;
    const mk = () => `${PREFIX}${String(++seq).padStart(6, '0')}`;
    const insertBatch = async (rows) => {
      if (!rows.length) return [];
      await pool.query(
        `INSERT INTO users (name, email, mobile, password, referral_code, referred_by, has_active_package, role, is_active)
         VALUES ?`,
        [rows.map(r => [r.code, `${r.code.toLowerCase()}@t.local`, '9000000000', 'x', r.code, r.parent, r.active ? 1 : 0, 'user', 1])]
      );
      const [got] = await pool.query('SELECT id, referral_code FROM users WHERE referral_code IN (?)', [rows.map(r => r.code)]);
      const byCode = new Map(got.map(g => [g.referral_code, g.id]));
      return rows.map(r => byCode.get(r.code));
    };

    // Root starts INACTIVE (to test the awaiting-activation path).
    [rootId] = await insertBatch([{ code: mk(), parent: null, active: false }]);
    await pool.query('INSERT INTO wallets (user_id, balance, earnings_balance) VALUES (?, 0, 0)', [rootId]);

    let parents = [rootId];
    for (let level = 1; level <= 6; level++) {
      const rows = [];
      for (const p of parents) for (let k = 0; k < 3; k++) rows.push({ code: mk(), parent: p, active: true });
      // one INACTIVE extra at level 2 — must not count
      if (level === 2) rows.push({ code: mk(), parent: parents[0], active: false });
      const ids = [];
      for (let i = 0; i < rows.length; i += 500) ids.push(...await insertBatch(rows.slice(i, i + 500)));
      parents = ids.slice(0, level === 2 ? ids.length - 1 : ids.length);
    }
  }, 120000);

  afterAll(async () => {
    if (pool) { await cleanup(); await pool.end(); }
  });

  test('recursive CTE counts active members per level (inactive excluded)', async () => {
    expect(await rewardService.getLevelCounts(rootId)).toEqual([3, 9, 27, 81, 243, 729]);
  });

  test('bulk all-users count agrees with the per-user count', async () => {
    const map = await rewardService.getAllLevelCounts();
    expect(map.get(rootId)).toEqual([3, 9, 27, 81, 243, 729]);
  });

  test('inactive root: 100% but not paid, Car locked', async () => {
    const r = await rewardService.recomputeUser(rootId, { plans: PLANS });
    expect(r.paid).toHaveLength(0);
    expect(r.results.map(x => x.status)).toEqual(['IN_PROGRESS', 'LOCKED']);
    expect(r.results[0].awaitingActivation).toBe(true);
    expect(r.results[1].progress.progressPct).toBe(5.59);
  });

  test('after activation: Bike paid exactly once even under concurrent recomputes', async () => {
    await pool.query('UPDATE users SET has_active_package = 1 WHERE id = ?', [rootId]);
    const runs = await Promise.all(Array.from({ length: 6 }, () => rewardService.recomputeUser(rootId, { plans: PLANS })));
    expect(runs.reduce((n, r) => n + r.paid.length, 0)).toBe(1);

    // and again sequentially
    const again = await rewardService.recomputeUser(rootId, { plans: PLANS });
    expect(again.paid).toHaveLength(0);
    expect(again.results.map(x => x.status)).toEqual(['PAID', 'IN_PROGRESS']);

    const [tx] = await pool.query("SELECT * FROM wallet_transactions WHERE user_id = ? AND type = 'reward'", [rootId]);
    expect(tx).toHaveLength(1);
    expect(parseFloat(tx[0].amount)).toBe(100000);
    expect(tx[0].description).toBe('Bike Fund Reward');
    expect(tx[0].reference_key).toBe(`RW-${rootId}-990001`);

    const [[w]] = await pool.query('SELECT earnings_balance FROM wallets WHERE user_id = ?', [rootId]);
    expect(parseFloat(w.earnings_balance)).toBe(100000);

    const [[prog]] = await pool.query('SELECT * FROM user_reward_progress WHERE user_id = ? AND reward_plan_id = 990001', [rootId]);
    expect(prog.status).toBe('PAID');
    expect(prog.transaction_id).toBe(tx[0].id);
    expect(String(tx[0].order_id)).toBe(String(prog.id)); // reference_id = progress.id
    expect(prog.achieved_at).not.toBeNull();
  });
});
