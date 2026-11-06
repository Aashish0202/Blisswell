// Milestone Rewards admin CLI.
//   node scripts/recomputeRewards.js <userId|referralCode>   recompute one user
//   node scripts/recomputeRewards.js --all                    run full reconciliation
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const pool = require('../config/db');
const RewardPlan = require('../models/RewardPlan');
const rewardService = require('../services/rewardService');

(async () => {
  const arg = process.argv[2];
  if (!arg) {
    console.log('Usage: node scripts/recomputeRewards.js <userId|referralCode> | --all');
    process.exit(1);
  }
  try {
    await RewardPlan.ensureSchema();
    if (arg === '--all') {
      console.log(await rewardService.reconcileAll());
    } else {
      const [rows] = await pool.execute(
        'SELECT id, name, referral_code FROM users WHERE id = ? OR referral_code = ? LIMIT 1',
        [/^\d+$/.test(arg) ? Number(arg) : 0, arg]
      );
      if (!rows[0]) throw new Error(`User not found: ${arg}`);
      const r = await rewardService.recomputeUser(rows[0].id);
      console.log(`${rows[0].referral_code} (${rows[0].name}) counts L1-L6: [${r.counts.join(', ')}]`);
      for (const d of r.results) console.log(`  ${d.plan.name} ${d.plan.matrix_label}: ${d.status} ${d.progress.progressPct}%`);
      if (r.paid.length) console.log('  PAID NOW:', r.paid);
    }
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
