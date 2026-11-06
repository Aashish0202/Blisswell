const pool = require('../config/db');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const TeamIncomeEvent = require('../models/TeamIncomeEvent');
const Product = require('../models/Product');

// Team Income business logic (rank model).
// Level income amounts come from the PURCHASER's product rank table
// (products.level_income, 10 entries). Business rule:
//   - an upline must have an active package to earn — that's the only
//     condition. Every active upline earns all 10 levels from their team's
//     purchases; there is no qualified-directs level-unlock requirement.
const teamIncomeService = {
  // Called from orderController (manual purchases) and qrPaymentService (QR approvals)
  // (upgrades) inside their purchase transactions. `product` is the
  // purchaser's product row (level_income already parsed to an array).
  // Idempotent via reference_key UNIQUE on team_income_events + wallet_transactions.
  async distributeForPurchase(connection, { purchaserId, orderId, product }) {
    if (!product || !Array.isArray(product.level_income)) {
      throw new Error('distributeForPurchase requires the purchaser product with level_income');
    }

    const settings = await Settings.getIncomeSettings(connection);
    const { maxLevels } = settings.qualification;
    const table = product.level_income; // [level1..level10]

    const upline = await User.getUpline(purchaserId, maxLevels, connection);
    const credited = [];

    for (const node of upline) {
      const level = node.level;
      const amount = table[level - 1] || 0;

      // Upline must be an active member to earn — the only condition.
      if (!node.has_active_package) continue;
      if (amount <= 0) continue; // covers locked table slots (e.g. Gold level 8)

      // qualifiedDirects is recorded on the event for reporting only — it no
      // longer gates which levels can earn.
      const qualifiedDirects = await User.countQualifiedDirects(node.id, connection);
      const refKey = `TI-${orderId}-${node.id}-${level}`;

      try {
        const txId = await WalletTransaction.create({
          user_id: node.id,
          type: 'team_income',
          amount,
          level,
          source_user_id: purchaserId,
          status: 'completed',
          reference_key: refKey,
          description: `Team Income Level ${level} from order #${orderId} (${product.rank_name})`
        }, connection);

        await TeamIncomeEvent.create({
          order_id: String(orderId),
          purchaser_id: purchaserId,
          upline_id: node.id,
          level,
          amount,
          rank_name: product.rank_name || null,
          product_id: product.id || null,
          qualified_directs: qualifiedDirects,
          max_unlocked_level: maxLevels,
          reference_key: refKey,
          transaction_id: txId
        }, connection);

        await Wallet.addEarnings(node.id, amount, connection);
        credited.push({ upline_id: node.id, level, amount });
      } catch (error) {
        // ER_DUP_ENTRY → already credited for this order/level (replay-safe).
        if (error.code === 'ER_DUP_ENTRY') continue;
        throw error;
      }
    }

    return credited;
  },

  // Per-rank team-income summary for the logged-in user. Shows all active
  // rank tables with the amounts the user would earn per level (if a
  // downline buys that rank); `earned` is the cumulative amount the user
  // has received at that level across all ranks. All 8 levels are always
  // available — the only condition to earn is having an active package.
  async getUplineEarningsSummary(userId, connection = pool) {
    const conn = connection;
    const totals = await TeamIncomeEvent.levelTotalsByUpline(userId, conn);
    const sourceTotals = await TeamIncomeEvent.sourceTotalsByUpline(userId, conn);
    const ranks = await Product.getActiveRanks(conn);
    // Users see the level table only down to the admin "Max Levels" (1..10),
    // matching their visible team. totalEarned still counts all real income.
    const { maxLevels: rawMax } = await Settings.getQualificationSettings(conn);
    const maxLevels = Math.min(10, Math.max(1, rawMax));

    let totalEarned = 0;
    for (const lvl of Object.keys(totals)) {
      totalEarned += totals[lvl]?.earned || 0;
    }

    return {
      totalEarned: parseFloat(totalEarned.toFixed(2)),
      maxLevels,
      // Income split by trigger: downline manual purchases vs the
      // auto-repurchase engine's rank upgrades.
      earnedFromPurchases: parseFloat(sourceTotals.purchase.toFixed(2)),
      earnedFromRepurchases: parseFloat(sourceTotals.repurchase.toFixed(2)),
      ranks: ranks.map(r => ({
        product_id: r.id,
        rank_name: r.rank_name,
        price: parseFloat(r.price),
        is_current: false, // set by callers if they know the user's current product
        levels: (r.level_income || []).slice(0, maxLevels).map((amount, idx) => {
          const level = idx + 1;
          const earned = totals[level]?.earned || 0;
          return {
            level,
            amount: parseFloat(amount) || 0,
            earned: parseFloat(earned.toFixed(2))
          };
        })
      }))
    };
  },

  async getUplineEvents(userId, page = 1, limit = 20, connection = pool, source = '') {
    const conn = connection;
    const rows = await TeamIncomeEvent.getByUpline(userId, page, limit, conn, source);
    const total = await TeamIncomeEvent.countByUpline(userId, conn, source);
    const totals = await TeamIncomeEvent.sourceTotalsByUpline(userId, conn);
    return {
      events: rows,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      // Breakdown of everything the user has earned, by what triggered it.
      totals: {
        purchase: parseFloat(totals.purchase.toFixed(2)),
        purchaseCount: totals.purchaseCount,
        repurchase: parseFloat(totals.repurchase.toFixed(2)),
        repurchaseCount: totals.repurchaseCount
      }
    };
  }
};

module.exports = teamIncomeService;