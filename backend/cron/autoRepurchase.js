const cron = require('node-cron');
const autoRepurchaseService = require('../services/autoRepurchaseService');

// Auto-repurchase sweep — the safety-net trigger for the rank upgrade engine.
// The primary trigger is the post-commit call in withdrawalService
// (processWithdrawal); this sweep covers anything it missed (server restarts,
// manual balance adjustments, engine failures) by re-checking every active
// user's repurchase wallet every 10 minutes.
// Off-minute so it never collides with the :00/:30 stampede or the
// expireProcessingOrders cron (which runs at xx:8/18/28/...).
const CRON_EXPRESSION = '3,13,23,33,43,53 * * * *';

const runAutoRepurchaseSweep = async () => {
  try {
    const processed = await autoRepurchaseService.sweep();
    if (processed.length > 0) {
      console.log(
        `[autoRepurchase] Sweep completed ${processed.length} user(s) upgrade(s): ` +
          processed.map(p => `user ${p.user_id} → ${p.upgrades.map(u => u.rank).join('→')}`).join('; ')
      );
    }
  } catch (error) {
    console.error('[autoRepurchase] Sweep error:', error);
  }
};

const initAutoRepurchaseCron = () => {
  cron.schedule(CRON_EXPRESSION, runAutoRepurchaseSweep, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
  console.log(
    `Auto-repurchase sweep cron scheduled (${CRON_EXPRESSION}) — ` +
      `users whose repurchase wallet affords their next rank upgrade are upgraded automatically.`
  );
};

module.exports = {
  initAutoRepurchaseCron,
  runAutoRepurchaseSweep
};