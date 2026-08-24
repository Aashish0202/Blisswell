const moment = require('moment');
const pool = require('../config/db');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const SalaryCycle = require('../models/SalaryCycle');
const SalaryPayout = require('../models/SalaryPayout');
const IncentiveCredit = require('../models/IncentiveCredit');
const Settings = require('../models/Settings');
const emailService = require('../utils/emailService');

// Daily incentive closing.
//
// Phase 1 — credit: for each active cycle with days_paid < days, credit the
//   cycle's daily_amount to the sponsor's EARNING wallet (separate from the
//   spendable balance), record an incentive_credits row (idempotent via
//   UNIQUE(cycle_id, payout_date)), and increment days_paid. Complete the
//   cycle once days_paid reaches days. An inactive sponsor just skips that
//   day's credit (no pause status is used).
//
// Phase 2 — withdrawals: on the admin-configured payout day (payout_day,
//   default Monday), sweep each user's withdrawable balance (earnings_balance
//   >= min_payout) into a pending salary_payout (withdrawal request), debiting
//   the earning wallet, and record a withdrawal wallet transaction. Admin later
//   pays it to the user's bank via the KYC "Mark Paid" flow. Gated by a
//   last_payout_date marker so it runs at most once per week.
exports.runDailyClosing = async () => {
  const today = moment().format('YYYY-MM-DD');
  console.log(`Starting daily incentive closing for ${today}...`);

  const stats = {
    credits: 0,
    credit_amount: 0,
    cycles_completed: 0,
    withdrawals: 0,
    withdrawal_amount: 0,
    errors: 0
  };

  try {
    const settings = await Settings.getPackageSettings();
    const minPayout = settings.min_payout_amount;

    // ---------- Phase 1: credit daily incentive ----------
    const activeCycles = await SalaryCycle.getActiveCyclesForProcessing();
    console.log(`Found ${activeCycles.length} active cycles to process`);

    for (const cycle of activeCycles) {
      const connection = await pool.getConnection();
      try {
        // Sponsor must still hold an active package. If they don't, simply skip
        // today's credit (the cycle stays 'active' and crediting resumes
        // automatically when they re-activate — no paused status is used).
        if (!cycle.sponsor_active) {
          await connection.rollback();
          continue;
        }

        // Idempotency: skip if already credited today
        if (await IncentiveCredit.exists(cycle.id, today, connection)) {
          await connection.rollback();
          continue;
        }

        await connection.beginTransaction();

        const amount = parseFloat(cycle.daily_amount);

        // 1) credit earning wallet
        const credited = await Wallet.addEarnings(cycle.sponsor_id, amount, connection);
        if (!credited) {
          await connection.rollback();
          stats.errors++;
          console.error(`Cycle ${cycle.id}: earning wallet missing for user ${cycle.sponsor_id}`);
          continue;
        }

        // 2) wallet transaction record (incentive, +amount)
        await WalletTransaction.create({
          user_id: cycle.sponsor_id,
          type: 'incentive',
          amount,
          status: 'completed',
          description: `Daily incentive — ${cycle.referral_name || 'referral'} (day ${cycle.days_paid + 1}/${cycle.days})`
        }, connection);

        // 3) incentive_credits ledger row (unique constraint = idempotency)
        await IncentiveCredit.create({
          cycle_id: cycle.id,
          user_id: cycle.sponsor_id,
          payout_date: today,
          amount
        }, connection);

        // 4) increment days_paid
        await SalaryCycle.incrementDaysPaid(cycle.id, connection);

        // 5) complete cycle if done
        const updated = await SalaryCycle.getById(cycle.id);
        if (updated.days_paid >= updated.days) {
          await SalaryCycle.complete(cycle.id);
          stats.cycles_completed++;
        }

        await connection.commit();
        stats.credits++;
        stats.credit_amount += amount;
      } catch (err) {
        await connection.rollback();
        stats.errors++;
        console.error(`Error processing cycle ${cycle.id}:`, err.message);
      } finally {
        connection.release();
      }
    }

    // ---------- Phase 2: weekly withdrawal sweep on the configured payout day ----------
    // Payouts are generated only on the admin-configured closing day (payout_day,
    // 0=Sun..6=Sat, default 1=Mon). The whole withdrawable balance (earnings_balance)
    // at/after that day is swept into a pending withdrawal request, debiting the
    // earning wallet. A last_payout_date marker makes this idempotent and recovers
    // a missed payout day on the next cron/boot tick.
    const payoutDay = settings.payout_day;
    const todayMoment = moment(today);
    const todayDay = todayMoment.day(); // 0=Sun..6=Sat
    const diff = (todayDay - payoutDay + 7) % 7;
    const scheduledDate = todayMoment.clone().subtract(diff, 'days').format('YYYY-MM-DD');

    let lastPayoutDate = await Settings.get('last_payout_date');

    // First-ever run: seed the baseline to the most recent payout day strictly
    // before today, so the first real sweep happens on the NEXT payout day
    // (or today if today is a payout day).
    if (!lastPayoutDate || lastPayoutDate === '1970-01-01') {
      const baselineDiff = diff === 0 ? 7 : diff;
      const baseline = todayMoment.clone().subtract(baselineDiff, 'days').format('YYYY-MM-DD');
      await Settings.set('last_payout_date', baseline);
      lastPayoutDate = baseline;
    }

    const shouldSweep = lastPayoutDate < scheduledDate;

    if (shouldSweep) {
      console.log(`Payout day reached (scheduled ${scheduledDate}); sweeping withdrawable balances >= ₹${minPayout}`);

      const [eligible] = await pool.execute(
        'SELECT user_id, earnings_balance FROM wallets WHERE earnings_balance >= ?',
        [minPayout]
      );
      console.log(`Found ${eligible.length} user(s) eligible for withdrawal (>= ₹${minPayout})`);

      for (const row of eligible) {
        const connection = await pool.getConnection();
        try {
          const amount = parseFloat(row.earnings_balance);
          if (amount <= 0) continue;

          await connection.beginTransaction();

          // debit the full withdrawable balance from the earning wallet
          const debited = await Wallet.debitEarnings(row.user_id, amount, connection);
          if (!debited) {
            await connection.rollback();
            continue;
          }

          // create pending withdrawal payout (dated to the scheduled payout day)
          await SalaryPayout.createWithdrawal({
            user_id: row.user_id,
            amount,
            payout_date: scheduledDate
          }, connection);

          // wallet transaction record (withdrawal, -amount)
          await WalletTransaction.create({
            user_id: row.user_id,
            type: 'withdrawal',
            amount: -amount,
            status: 'completed',
            description: `Weekly withdrawal request (auto) — ₹${amount}`
          }, connection);

          await connection.commit();
          stats.withdrawals++;
          stats.withdrawal_amount += amount;

          // notify the user (single email per withdrawal, not per daily credit)
          try {
            const user = await User.findById(row.user_id);
            if (user) {
              emailService.sendPayoutEmail(user, amount, 'Withdrawal')
                .catch(e => console.error('Withdrawal email error:', e));
            }
          } catch (e) {
            console.error('Withdrawal email error:', e);
          }
        } catch (err) {
          await connection.rollback();
          stats.errors++;
          console.error(`Withdrawal error for user ${row.user_id}:`, err.message);
        } finally {
          connection.release();
        }
      }

      // mark this payout period done (idempotency)
      await Settings.set('last_payout_date', scheduledDate);
    } else {
      console.log(`Not a payout day (today=${todayMoment.format('dddd')}, payout_day=${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][payoutDay]}); skipping withdrawal sweep.`);
    }

    console.log(`Daily closing completed: ${stats.credits} credits (₹${stats.credit_amount}), ${stats.withdrawals} withdrawals (₹${stats.withdrawal_amount}), ${stats.cycles_completed} completed, ${stats.errors} errors`);
    return { success: true, date: today, ...stats };
  } catch (error) {
    console.error('Daily closing error:', error);
    return { success: false, error: error.message };
  }
};

// Resume paused cycles (when a user activates/re-activates their package)
exports.resumePausedCycles = async (userId) => {
  try {
    const pausedCycles = await SalaryCycle.getAll(1, 1000, {
      sponsor_id: userId,
      status: 'paused'
    });

    const list = pausedCycles.cycles || pausedCycles;
    for (const cycle of list) {
      await SalaryCycle.resume(cycle.id);
      console.log(`Cycle ${cycle.id} resumed`);
    }

    return { success: true, resumed: list.length };
  } catch (error) {
    console.error('Resume cycles error:', error);
    return { success: false, error: error.message };
  }
};

// Get daily closing summary (admin)
exports.getDailyClosingSummary = async (req, res) => {
  try {
    const date = req.query.date || moment().format('YYYY-MM-DD');

    const creditSummary = await IncentiveCredit.getDailySummary(date);

    const [withdrawals] = await pool.execute(
      `SELECT
        COUNT(*) as withdrawal_count,
        COALESCE(SUM(amount), 0) as withdrawal_amount
       FROM salary_payouts
       WHERE payout_date = ? AND cycle_id IS NULL`,
      [date]
    );

    const activeCycles = await SalaryCycle.countByStatus('active');
    const pausedCycles = await SalaryCycle.countByStatus('paused');
    const pendingPayouts = await SalaryPayout.countByStatus('pending');
    const pendingAmount = await SalaryPayout.getTotalByStatus('pending');

    res.json({
      date,
      summary: {
        credit_count: creditSummary.credit_count,
        credit_amount: parseFloat(creditSummary.total_credited),
        withdrawal_count: withdrawals[0].withdrawal_count,
        withdrawal_amount: parseFloat(withdrawals[0].withdrawal_amount),
        active_cycles: activeCycles,
        paused_cycles: pausedCycles,
        pending_payouts: pendingPayouts,
        pending_payout_amount: parseFloat(pendingAmount)
      }
    });
  } catch (error) {
    console.error('Get daily closing summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manual trigger for daily closing (admin only)
exports.triggerDailyClosing = async (req, res) => {
  try {
    const result = await exports.runDailyClosing();

    if (result.success) {
      res.json({
        message: 'Daily closing completed successfully',
        ...result
      });
    } else {
      res.status(500).json({
        message: 'Daily closing failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Trigger daily closing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};