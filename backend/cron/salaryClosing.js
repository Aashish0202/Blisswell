const cron = require('node-cron');
const moment = require('moment');
const salaryController = require('../controllers/salaryController');
const Settings = require('../models/Settings');

// Initialize cron job for monthly salary closing
const initSalaryCron = () => {
  // Run at 00:05 on the closing day (default: 5th of every month)
  const init = async () => {
    const settings = await Settings.getPackageSettings();
    const closingDay = settings.closing_day || 5;

    // Schedule cron job
    cron.schedule(`5 0 ${closingDay} * *`, async () => {
      console.log(`Running monthly salary closing on day ${closingDay}`);
      const result = await salaryController.runMonthlyClosing();
      console.log('Closing result:', result);
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    console.log(`Salary closing cron scheduled for day ${closingDay} of each month`);
  };

  init().catch(err => console.error('Failed to initialize cron:', err));
};

// Manual trigger function
const triggerClosing = async () => {
  return await salaryController.runMonthlyClosing();
};

module.exports = {
  initSalaryCron,
  triggerClosing
};