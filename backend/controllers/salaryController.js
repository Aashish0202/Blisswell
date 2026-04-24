const moment = require('moment');
const User = require('../models/User');
const SalaryCycle = require('../models/SalaryCycle');
const SalaryPayout = require('../models/SalaryPayout');
const Settings = require('../models/Settings');

// Monthly salary closing process
exports.runMonthlyClosing = async () => {
  console.log('Starting sales incentive closing...');

  try {
    const settings = await Settings.getPackageSettings();
    const currentMonth = moment().month() + 1; // 1-12
    const currentYear = moment().year();

    // Get all active cycles
    const activeCycles = await SalaryCycle.getActiveCyclesForProcessing();

    console.log(`Found ${activeCycles.length} active cycles to process`);

    for (const cycle of activeCycles) {
      try {
        // Check if sponsor is active
        const sponsorActive = await User.hasActivePackage(cycle.sponsor_id);

        if (sponsorActive) {
          // Check if payout already exists for this month
          const existingPayout = await SalaryPayout.getByCycleAndMonth(
            cycle.id,
            currentMonth,
            currentYear
          );

          if (!existingPayout) {
            // Generate payout
            await SalaryPayout.create({
              cycle_id: cycle.id,
              user_id: cycle.sponsor_id,
              month: currentMonth,
              year: currentYear,
              amount: cycle.monthly_amount,
              status: 'pending'
            });

            // Increment months paid
            await SalaryCycle.incrementMonthsPaid(cycle.id);

            // Check if cycle is complete
            const updatedCycle = await SalaryCycle.getById(cycle.id);
            if (updatedCycle.months_paid >= updatedCycle.duration) {
              await SalaryCycle.complete(cycle.id);
              console.log(`Cycle ${cycle.id} completed`);
            }

            console.log(`Payout generated for cycle ${cycle.id}`);
          }
        } else {
          // Sponsor inactive - pause cycle
          await SalaryCycle.pause(cycle.id);
          console.log(`Cycle ${cycle.id} paused due to inactive sponsor`);
        }
      } catch (error) {
        console.error(`Error processing cycle ${cycle.id}:`, error);
      }
    }

    console.log('Sales Incentive closing completed');
    return { success: true, processed: activeCycles.length };
  } catch (error) {
    console.error('Monthly closing error:', error);
    return { success: false, error: error.message };
  }
};

// Resume paused cycles (when sponsor becomes active again)
exports.resumePausedCycles = async (userId) => {
  try {
    const pausedCycles = await SalaryCycle.getAll(1, 1000, {
      sponsor_id: userId,
      status: 'paused'
    });

    for (const cycle of pausedCycles.cycles || pausedCycles) {
      await SalaryCycle.resume(cycle.id);
      console.log(`Cycle ${cycle.id} resumed`);
    }

    return { success: true, resumed: (pausedCycles.cycles || pausedCycles).length };
  } catch (error) {
    console.error('Resume cycles error:', error);
    return { success: false, error: error.message };
  }
};

// Get monthly closing summary
exports.getMonthlyClosingSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = month || moment().month() + 1;
    const currentYear = year || moment().year();

    const pendingPayouts = await SalaryPayout.getAll(1, 1000, {
      status: 'pending',
      month: currentMonth,
      year: currentYear
    });

    const paidPayouts = await SalaryPayout.getAll(1, 1000, {
      status: 'paid',
      month: currentMonth,
      year: currentYear
    });

    const activeCycles = await SalaryCycle.countByStatus('active');
    const pausedCycles = await SalaryCycle.countByStatus('paused');

    const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPaidAmount = paidPayouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    res.json({
      month: currentMonth,
      year: currentYear,
      summary: {
        pending_count: pendingPayouts.length,
        pending_amount: totalPendingAmount,
        paid_count: paidPayouts.length,
        paid_amount: totalPaidAmount,
        active_cycles: activeCycles,
        paused_cycles: pausedCycles
      }
    });
  } catch (error) {
    console.error('Get closing summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manual trigger for monthly closing (admin only)
exports.triggerMonthlyClosing = async (req, res) => {
  try {
    const result = await exports.runMonthlyClosing();

    if (result.success) {
      res.json({
        message: 'Monthly closing completed successfully',
        processed: result.processed
      });
    } else {
      res.status(500).json({
        message: 'Monthly closing failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Trigger closing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};