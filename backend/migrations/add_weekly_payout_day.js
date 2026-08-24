/**
 * Weekly payout-day migration.
 *
 * Switches withdrawal generation from a daily threshold-based trigger to a
 * fixed weekly closing day (default Monday). Adds:
 *   - payout_day       : day of week 0=Sun .. 6=Sat (default 1 = Monday)
 *   - last_payout_date : last date a weekly payout sweep ran (idempotency marker)
 *
 * Idempotent: safe to run multiple times.
 */
const pool = require('../config/db');

async function settingExists(key) {
  const [rows] = await pool.execute(
    'SELECT setting_key FROM settings WHERE setting_key = ?',
    [key]
  );
  return rows.length > 0;
}

async function insertSetting(key, value) {
  if (await settingExists(key)) {
    console.log(`  ✓ Setting '${key}' already exists, skipping`);
    return;
  }
  await pool.execute(
    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
    [key, value]
  );
  console.log(`  + Added setting '${key}' = ${value}`);
}

async function up() {
  console.log('Running weekly payout-day migration...');

  // payout_day: 0=Sunday ... 6=Saturday. Default Monday (1).
  await insertSetting('payout_day', '1');

  // last_payout_date: epoch-ish seed so the first scheduled payout day runs.
  await insertSetting('last_payout_date', '1970-01-01');

  console.log('Weekly payout-day migration complete.');
}

(async () => {
  try {
    await up();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();