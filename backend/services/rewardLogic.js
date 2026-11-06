// Pure (DB-free) rules for Milestone Rewards — Bike Fund (3x3), Car Fund (5x5).
// Kept separate from rewardService so the business rules are unit-testable.
//
//   • "Active team at level N" = ACTIVE members exactly N levels deep in the
//     user's downline (all branches, unlimited width).
//   • A plan is complete when every one of its 6 level counts ≥ required.
//   • Plans are sequential (by sequence_order): a plan stays LOCKED until the
//     previous active plan is ACHIEVED/PAID. Progress is still calculated.
//   • Progress % = Σ min(actual, required) / Σ required × 100 (2 decimals).
//   • PAID is terminal — once paid, a plan is never paid again or reverted.

const LEVELS = 6;
const STATUS = Object.freeze({
  LOCKED: 'LOCKED',
  IN_PROGRESS: 'IN_PROGRESS',
  ACHIEVED: 'ACHIEVED',
  PAID: 'PAID'
});

// Normalise anything (array, JSON string, sparse) to exactly 6 non-negative ints.
function normalizeCounts(value) {
  let arr = value;
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr); } catch (_) { arr = []; }
  }
  if (!Array.isArray(arr)) arr = [];
  const out = [];
  for (let i = 0; i < LEVELS; i++) {
    const n = Math.floor(Number(arr[i]));
    out.push(Number.isFinite(n) && n > 0 ? n : 0);
  }
  return out;
}

// Validate an admin-supplied required_counts value. Returns the clean array
// or throws with a user-facing message.
function validateRequiredCounts(value) {
  let arr = value;
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr); } catch (_) { throw new Error('required_counts must be a JSON array of 6 numbers'); }
  }
  if (!Array.isArray(arr) || arr.length !== LEVELS) {
    throw new Error(`required_counts must contain exactly ${LEVELS} numbers (L1–L${LEVELS})`);
  }
  return arr.map((v, i) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) throw new Error(`Level ${i + 1} requirement must be a whole number ≥ 1`);
    return n;
  });
}

// Per-plan progress from actual level counts.
function computeProgress(actualCounts, requiredCounts) {
  const actual = normalizeCounts(actualCounts);
  const required = normalizeCounts(requiredCounts);
  let achieved = 0;
  let total = 0;
  const levels = required.map((req, i) => {
    const act = actual[i];
    achieved += Math.min(act, req);
    total += req;
    return { level: i + 1, actual: act, required: req, met: act >= req };
  });
  const pct = total > 0 ? Math.round((achieved / total) * 10000) / 100 : 0;
  return {
    levels,
    achievedTotal: achieved,
    requiredTotal: total,
    progressPct: pct,
    complete: total > 0 && levels.every(l => l.met)
  };
}

// Decide the next state of every plan for one user.
//   plans       — active plans (any order; sorted here by sequence_order, id)
//   counts      — the user's 6 active-team level counts
//   existing    — { [planId]: { status, transaction_id } } current DB rows
//   userEligible — user's own package is active (required for payout)
// Returns one decision per plan: { plan, progress, status, pay, awaitingActivation }.
// `pay: true` means "credit the reward now" — never true for an already-PAID plan.
function evaluatePlans(plans, counts, existing = {}, userEligible = true) {
  const ordered = [...plans].sort(
    (a, b) => (a.sequence_order - b.sequence_order) || (a.id - b.id)
  );
  let previousDone = true;
  return ordered.map(plan => {
    const progress = computeProgress(counts, plan.required_counts);
    const prior = existing[plan.id] || {};
    let status;
    let pay = false;
    let awaitingActivation = false;

    if (prior.status === STATUS.PAID) {
      status = STATUS.PAID; // terminal; counts/pct still refresh for display
    } else if (!previousDone) {
      status = STATUS.LOCKED;
    } else if (progress.complete && userEligible) {
      status = STATUS.PAID; // ACHIEVED → PAID happens in the same DB transaction
      pay = true;
    } else {
      status = STATUS.IN_PROGRESS;
      awaitingActivation = progress.complete && !userEligible;
    }

    previousDone = status === STATUS.PAID || status === STATUS.ACHIEVED;
    return { plan, progress, status, pay, awaitingActivation };
  });
}

// Aggregate rows of { ancestor_id, depth, cnt } (from the bulk CTE) into
// Map<userId, number[6]>.
function buildCountsMap(rows) {
  const map = new Map();
  for (const r of rows) {
    const uid = Number(r.ancestor_id);
    const depth = Number(r.depth);
    if (!uid || depth < 1 || depth > LEVELS) continue;
    if (!map.has(uid)) map.set(uid, new Array(LEVELS).fill(0));
    map.get(uid)[depth - 1] += Number(r.cnt) || 0;
  }
  return map;
}

// Rows of { level, cnt } (single-user CTE) → number[6].
function countsFromLevelRows(rows) {
  const out = new Array(LEVELS).fill(0);
  for (const r of rows) {
    const lvl = Number(r.level);
    if (lvl >= 1 && lvl <= LEVELS) out[lvl - 1] += Number(r.cnt) || 0;
  }
  return out;
}

module.exports = {
  LEVELS,
  STATUS,
  normalizeCounts,
  validateRequiredCounts,
  computeProgress,
  evaluatePlans,
  buildCountsMap,
  countsFromLevelRows
};
