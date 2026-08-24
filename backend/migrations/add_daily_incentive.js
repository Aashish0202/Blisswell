const pool = require('../config/db');

// Helper: list column names for a table
async function getColumns(table) {
  const [cols] = await pool.execute(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `, [table]);
  return cols.map(c => c.COLUMN_NAME);
}

// Helper: list index names for a table
async function getIndexes(table) {
  const [idx] = await pool.execute(`
    SELECT DISTINCT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `, [table]);
  return idx.map(i => i.INDEX_NAME);
}

async function addColumnIfMissing(table, column, ddl) {
  const cols = await getColumns(table);
  if (!cols.includes(column)) {
    console.log(`  + ${table}.${column}`);
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  } else {
    console.log(`  = ${table}.${column} already exists`);
  }
}

async function runMigration() {
  try {
    console.log('Running migration: daily incentive + earning wallet + withdrawal schema...\n');

    // 1. wallets: add earnings_balance (separate from spendable balance)
    await addColumnIfMissing('wallets', 'earnings_balance',
      'earnings_balance DECIMAL(12,2) DEFAULT 0.00 AFTER balance');

    // 2. products: add daily_amount + days (keep legacy salary_amount/salary_duration)
    await addColumnIfMissing('products', 'daily_amount',
      'daily_amount DECIMAL(12,2) DEFAULT 0.00 AFTER salary_duration');
    await addColumnIfMissing('products', 'days',
      'days INT DEFAULT 0 AFTER daily_amount');

    // Backfill products: derive daily_amount/days from legacy monthly fields where empty
    const [products] = await pool.execute(
      `SELECT id, salary_amount, salary_duration, daily_amount, days FROM products`
    );
    for (const p of products) {
      if ((parseFloat(p.daily_amount) === 0 || p.daily_amount === null) && p.salary_amount) {
        await pool.execute(
          `UPDATE products SET daily_amount = ?, days = ? WHERE id = ?`,
          [p.salary_amount, p.salary_duration || 12, p.id]
        );
      }
    }
    console.log('  ~ products daily_amount/days backfilled from legacy fields\n');

    // 3. salary_cycles: add daily fields
    await addColumnIfMissing('salary_cycles', 'daily_amount',
      'daily_amount DECIMAL(12,2) DEFAULT 0.00 AFTER monthly_amount');
    await addColumnIfMissing('salary_cycles', 'days',
      'days INT DEFAULT 0 AFTER duration');
    await addColumnIfMissing('salary_cycles', 'days_paid',
      'days_paid INT DEFAULT 0 AFTER months_paid');
    await addColumnIfMissing('salary_cycles', 'start_date',
      'start_date DATE NULL AFTER start_month');

    // Convert existing cycles in place: daily_amount=monthly_amount, days=duration, days_paid=months_paid, start_date=start_month
    const [cycles] = await pool.execute(
      `SELECT id, monthly_amount, duration, months_paid, start_month, daily_amount, days, days_paid, start_date FROM salary_cycles`
    );
    let converted = 0;
    for (const c of cycles) {
      const needDaily = (parseFloat(c.daily_amount) === 0 || c.daily_amount === null) && c.monthly_amount;
      const needDays = (c.days === 0 || c.days === null) && c.duration;
      const needStart = !c.start_date && c.start_month;
      if (needDaily || needDays || needStart) {
        await pool.execute(
          `UPDATE salary_cycles
           SET daily_amount = ?, days = ?, days_paid = ?, start_date = ?
           WHERE id = ?`,
          [
            c.monthly_amount,
            c.duration || 12,
            c.months_paid || 0,
            c.start_month,
            c.id
          ]
        );
        converted++;
      }
    }
    console.log(`  ~ ${converted} existing cycle(s) converted to daily model\n`);

    // 4. incentive_credits: daily credit ledger + idempotency
    const [credTables] = await pool.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incentive_credits'
    `);
    if (credTables.length === 0) {
      console.log('  + incentive_credits table');
      await pool.execute(`
        CREATE TABLE incentive_credits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cycle_id INT NOT NULL,
          user_id INT NOT NULL,
          payout_date DATE NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cycle_id) REFERENCES salary_cycles(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_cycle_date (cycle_id, payout_date),
          INDEX idx_user_date (user_id, payout_date),
          UNIQUE KEY unique_cycle_payout_date (cycle_id, payout_date)
        )
      `);
    } else {
      console.log('  = incentive_credits table already exists');
    }

    // 5. salary_payouts: repurpose as withdrawal payout
    //    cycle_id -> nullable (withdrawal aggregates earnings across cycles)
    const spCols = await getColumns('salary_payouts');
    if (spCols.includes('cycle_id')) {
      const [cycleIdRow] = await pool.execute(`
        SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_payouts' AND COLUMN_NAME = 'cycle_id'
      `);
      if (cycleIdRow[0].IS_NULLABLE === 'NO') {
        console.log('  ~ salary_payouts.cycle_id -> NULLABLE');
        await pool.execute(`ALTER TABLE salary_payouts MODIFY cycle_id INT NULL`);
      }
    }
    // month/year -> nullable (withdrawal rows have no month/year)
    if (spCols.includes('month')) {
      const [m] = await pool.execute(`
        SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_payouts' AND COLUMN_NAME = 'month'
      `);
      if (m[0].IS_NULLABLE === 'NO') {
        await pool.execute(`ALTER TABLE salary_payouts MODIFY month INT NULL`);
      }
    }
    if (spCols.includes('year')) {
      const [y] = await pool.execute(`
        SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salary_payouts' AND COLUMN_NAME = 'year'
      `);
      if (y[0].IS_NULLABLE === 'NO') {
        await pool.execute(`ALTER TABLE salary_payouts MODIFY year INT NULL`);
      }
    }
    // payout_date column for date-based filtering
    await addColumnIfMissing('salary_payouts', 'payout_date',
      'payout_date DATE NULL AFTER year');
    // Drop unique_cycle_month (incompatible with nullable cycle_id withdrawal rows)
    const spIdx = await getIndexes('salary_payouts');
    if (spIdx.includes('unique_cycle_month')) {
      console.log('  - salary_payouts.unique_cycle_month index');
      await pool.execute(`ALTER TABLE salary_payouts DROP INDEX unique_cycle_month`);
    }
    console.log('');

    // 6. wallet_transactions: extend type enum with incentive + withdrawal
    const [wtType] = await pool.execute(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_transactions' AND COLUMN_NAME = 'type'
    `);
    if (wtType.length && !wtType[0].COLUMN_TYPE.includes('incentive')) {
      console.log('  ~ wallet_transactions.type enum +incentive +withdrawal');
      await pool.execute(`
        ALTER TABLE wallet_transactions
        MODIFY COLUMN type ENUM('deposit','purchase','refund','bonus','incentive','withdrawal') NOT NULL
      `);
    } else {
      console.log('  = wallet_transactions.type already extended');
    }

    // 7. settings: drop legacy keys, add new ones
    const [legacySettings] = await pool.execute(
      `SELECT setting_key FROM settings WHERE setting_key IN ('closing_day','salary_amount','salary_duration')`
    );
    if (legacySettings.length) {
      console.log(`  - ${legacySettings.length} legacy setting(s) (closing_day/salary_amount/salary_duration)`);
      await pool.execute(
        `DELETE FROM settings WHERE setting_key IN ('closing_day','salary_amount','salary_duration')`
      );
    }
    await pool.execute(`
      INSERT INTO settings (setting_key, setting_value, description) VALUES
        ('min_payout_amount', '500', 'Minimum earning-wallet balance to auto-generate a withdrawal payout'),
        ('default_daily_amount', '50', 'Default daily incentive per product'),
        ('default_days', '15', 'Default incentive days per product')
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);
    console.log('  + settings: min_payout_amount, default_daily_amount, default_days\n');

    // 8. salary_summary view: daily liability
    console.log('  ~ salary_summary view (daily liability)');
    await pool.execute(`
      CREATE OR REPLACE VIEW salary_summary AS
      SELECT
        sc.sponsor_id,
        u.name as sponsor_name,
        COUNT(sc.id) as total_cycles,
        SUM(CASE WHEN sc.status = 'active' THEN 1 ELSE 0 END) as active_cycles,
        SUM(CASE WHEN sc.status = 'paused' THEN 1 ELSE 0 END) as paused_cycles,
        SUM(CASE WHEN sc.status = 'completed' THEN 1 ELSE 0 END) as completed_cycles,
        COALESCE(SUM(
          CASE WHEN sc.days > 0
            THEN (sc.days - sc.days_paid) * sc.daily_amount
            ELSE (sc.duration - sc.months_paid) * sc.monthly_amount
          END
        ), 0) as remaining_liability
      FROM salary_cycles sc
      JOIN users u ON u.id = sc.sponsor_id
      GROUP BY sc.sponsor_id
    `);

    console.log('\n✅ Daily incentive migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();