const cron = require('node-cron');
const rewardService = require('../services/rewardService');

// Daily Milestone Rewards reconciliation — recomputes everyone's progress and
// backfills any payout missed by the on-activation hook. Idempotent.
// 02:17 IST (off-peak, off the :00 stampede). Override with REWARD_CRON.
const CRON_EXPRESSION = process.env.REWARD_CRON || '17 2 * * *';

let running = false;
const run = async () => {
  if (running) return; // never overlap
  running = true;
  try {
    await rewardService.reconcileAll();
  } catch (error) {
    console.error('[rewardReconciliation] failed:', error);
  } finally {
    running = false;
  }
};

const initRewardReconciliationCron = () => {
  cron.schedule(CRON_EXPRESSION, run, { scheduled: true, timezone: 'Asia/Kolkata' });
  console.log(`Milestone reward reconciliation cron scheduled (${CRON_EXPRESSION} IST).`);
};

module.exports = { initRewardReconciliationCron, runRewardReconciliation: run };
