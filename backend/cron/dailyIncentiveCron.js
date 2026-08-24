const cron = require('node-cron');
const salaryController = require('../controllers/salaryController');

// Daily incentive cron.
//
// Fires at 00:05 every day (Asia/Kolkata) and runs the daily closing, which:
//   1) credits each active cycle's daily_amount to the sponsor's earning wallet
//   2) on the admin-configured payout day (default Monday), sweeps each user's
//      withdrawable balance (>= min_payout) into a pending withdrawal payout.
//      Phase 2 is gated by payout_day + a last_payout_date idempotency marker,
//      so it runs at most once per week and recovers a missed day on the next tick.
//
// On boot we also run one catch-up pass — if the server was down at 00:05,
// the missed run still executes when the server starts. The closing is
// idempotent (incentive_credits has a UNIQUE(cycle_id, payout_date) constraint
// and Phase 2 uses last_payout_date), so re-running the same day never
// double-credits or double-sweeps.
const initDailyIncentiveCron = () => {
  // Schedule: 00:05 daily
  cron.schedule('5 0 * * *', async () => {
    console.log('Running scheduled daily incentive closing...');
    const result = await salaryController.runDailyClosing();
    console.log('Daily closing result:', result);
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('Daily incentive cron scheduled for 00:05 IST every day');

  // Boot catch-up: run once on startup so a server that was offline at 00:05
  // still credits the current day. Safe because of idempotency.
  setTimeout(() => {
    console.log('Running boot catch-up daily closing...');
    salaryController.runDailyClosing()
      .then(result => console.log('Boot catch-up result:', result))
      .catch(err => console.error('Boot catch-up closing error:', err));
  }, 5000);
};

// Manual trigger
const triggerClosing = async () => {
  return await salaryController.runDailyClosing();
};

module.exports = {
  initDailyIncentiveCron,
  triggerClosing
};