const {
  STATUS, computeProgress, evaluatePlans, buildCountsMap, countsFromLevelRows,
  normalizeCounts, validateRequiredCounts
} = require('../services/rewardLogic');

const BIKE = { id: 1, name: 'Bike Fund', sequence_order: 1, reward_amount: 100000, required_counts: [3, 9, 27, 81, 243, 729] };
const CAR = { id: 2, name: 'Car Fund', sequence_order: 2, reward_amount: 900000, required_counts: [5, 25, 125, 625, 3125, 15625] };
const FULL_3x3 = [3, 9, 27, 81, 243, 729];
const FULL_5x5 = [5, 25, 125, 625, 3125, 15625];

describe('level counting aggregation', () => {
  test('single-user CTE rows → 6 counts, missing levels are 0', () => {
    expect(countsFromLevelRows([{ level: 1, cnt: 3 }, { level: 3, cnt: '18' }])).toEqual([3, 0, 18, 0, 0, 0]);
  });
  test('ignores depth outside 1..6', () => {
    expect(countsFromLevelRows([{ level: 0, cnt: 5 }, { level: 7, cnt: 5 }, { level: 6, cnt: 2 }])).toEqual([0, 0, 0, 0, 0, 2]);
  });
  test('bulk CTE rows → per-ancestor map', () => {
    const m = buildCountsMap([
      { ancestor_id: 10, depth: 1, cnt: 3 },
      { ancestor_id: 10, depth: 2, cnt: 9 },
      { ancestor_id: 11, depth: 1, cnt: 1 },
      { ancestor_id: 11, depth: 9, cnt: 99 }
    ]);
    expect(m.get(10)).toEqual([3, 9, 0, 0, 0, 0]);
    expect(m.get(11)).toEqual([1, 0, 0, 0, 0, 0]);
  });
  test('normalizeCounts handles JSON strings, junk, negatives', () => {
    expect(normalizeCounts('[1,2,3]')).toEqual([1, 2, 3, 0, 0, 0]);
    expect(normalizeCounts('nope')).toEqual([0, 0, 0, 0, 0, 0]);
    expect(normalizeCounts([-4, 2.9, null, 'x', 5, 6, 7])).toEqual([0, 2, 0, 0, 5, 6]);
  });
});

describe('progress %', () => {
  test('zero team → 0%', () => {
    expect(computeProgress([0, 0, 0, 0, 0, 0], BIKE.required_counts).progressPct).toBe(0);
  });
  test('surplus at a level is capped at the requirement', () => {
    // 100 directs only count as 3 → 3/1092
    const p = computeProgress([100, 0, 0, 0, 0, 0], BIKE.required_counts);
    expect(p.achievedTotal).toBe(3);
    expect(p.progressPct).toBe(0.27);
    expect(p.complete).toBe(false);
  });
  test('two-decimal rounding', () => {
    // (3+9+18)/1092 = 2.747…%
    expect(computeProgress([3, 9, 18, 0, 0, 0], BIKE.required_counts).progressPct).toBe(2.75);
  });
  test('full 3x3 → 100% complete; same team is 5.59% of 5x5', () => {
    expect(computeProgress(FULL_3x3, BIKE.required_counts)).toMatchObject({ progressPct: 100, complete: true, requiredTotal: 1092 });
    expect(computeProgress(FULL_3x3, CAR.required_counts)).toMatchObject({ progressPct: 5.59, complete: false, requiredTotal: 19530 });
  });
  test('all six levels must be met — 99.x% is not complete', () => {
    const p = computeProgress([3, 9, 27, 81, 243, 728], BIKE.required_counts);
    expect(p.complete).toBe(false);
    expect(p.progressPct).toBe(99.91);
    expect(p.levels[5]).toEqual({ level: 6, actual: 728, required: 729, met: false });
  });
});

describe('sequential lock', () => {
  test('Car Fund is LOCKED until Bike Fund is done, but progress is still computed', () => {
    const [bike, car] = evaluatePlans([CAR, BIKE], [5, 25, 30, 0, 0, 0], {}, true);
    expect(bike.plan.id).toBe(1); // sorted by sequence_order
    expect(bike.status).toBe(STATUS.IN_PROGRESS);
    expect(car.status).toBe(STATUS.LOCKED);
    expect(car.pay).toBe(false);
    expect(car.progress.progressPct).toBeGreaterThan(0);
  });
  test('even a fully met 5x5 is not payable while 3x3 is unpaid (user inactive)', () => {
    const [bike, car] = evaluatePlans([BIKE, CAR], FULL_5x5, {}, false);
    expect(bike.status).toBe(STATUS.IN_PROGRESS);
    expect(bike.awaitingActivation).toBe(true);
    expect(car.status).toBe(STATUS.LOCKED);
  });
  test('Bike PAID unlocks Car → IN_PROGRESS', () => {
    const [, car] = evaluatePlans([BIKE, CAR], FULL_3x3, { 1: { status: 'PAID' } }, true);
    expect(car.status).toBe(STATUS.IN_PROGRESS);
  });
  test('meeting both in one pass pays both, in order', () => {
    const d = evaluatePlans([BIKE, CAR], FULL_5x5, {}, true);
    expect(d.map(x => [x.status, x.pay])).toEqual([[STATUS.PAID, true], [STATUS.PAID, true]]);
  });
});

describe('idempotent payout', () => {
  test('already-PAID plan is never paid again', () => {
    const d = evaluatePlans([BIKE, CAR], FULL_5x5, { 1: { status: 'PAID' }, 2: { status: 'PAID' } }, true);
    expect(d.every(x => x.status === STATUS.PAID && x.pay === false)).toBe(true);
  });
  test('PAID is terminal even if the team later shrinks or the user deactivates', () => {
    const [bike, car] = evaluatePlans([BIKE, CAR], [0, 0, 0, 0, 0, 0], { 1: { status: 'PAID' } }, false);
    expect(bike).toMatchObject({ status: STATUS.PAID, pay: false });
    expect(car.status).toBe(STATUS.IN_PROGRESS); // stays unlocked
  });
  test('inactive user: complete but unpaid until activation', () => {
    const [bike] = evaluatePlans([BIKE], FULL_3x3, {}, false);
    expect(bike).toMatchObject({ status: STATUS.IN_PROGRESS, pay: false, awaitingActivation: true });
    const [again] = evaluatePlans([BIKE], FULL_3x3, {}, true);
    expect(again).toMatchObject({ status: STATUS.PAID, pay: true });
  });
});

describe('admin validation', () => {
  test('requires exactly 6 positive integers', () => {
    expect(validateRequiredCounts('[3,9,27,81,243,729]')).toEqual(FULL_3x3);
    expect(() => validateRequiredCounts([1, 2, 3])).toThrow(/exactly 6/);
    expect(() => validateRequiredCounts([1, 2, 3, 4, 5, 0])).toThrow(/Level 6/);
    expect(() => validateRequiredCounts([1, 2, 3, 4, 5, 1.5])).toThrow(/whole number/);
  });
});
