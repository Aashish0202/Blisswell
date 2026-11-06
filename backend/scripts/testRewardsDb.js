// Runs the Milestone Rewards DB integration test against the LOCAL database.
// Usage: npm run test:db
process.env.RUN_DB_TESTS = '1';
require('jest').run(['--runInBand', 'tests/rewards.db.test.js']);
