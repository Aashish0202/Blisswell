// =====================================================================
// autoMigration.js — runs pending income-rework SQL migrations at startup
// ---------------------------------------------------------------------
// Checks whether the database schema is current (income-system rework);
// if not, executes the non-destructive migration file before the server
// starts accepting requests. Fully idempotent, safe to run on every boot.
// =====================================================================
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const pool = require('../config/db');

const MIGRATION_FILE = path.join(__dirname, '..', 'migrations', '003_production_income_rework.sql');

// Every marker the migration introduces. If ALL are present the schema is
// current; any missing one (or a failing check, e.g. brand-new DB with no
// tables) triggers a full run of the migration file, which creates the rest.
async function schemaIsCurrent() {
  const [rows] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='rank_name') AS users_rank,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='current_product_id') AS users_product,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallets' AND COLUMN_NAME='repurchase_balance') AS wallets_repurchase,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wallet_transactions' AND COLUMN_NAME='reference_key') AS wt_reference,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='order_source') AS orders_source,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='level_income') AS products_rank,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND COLUMN_NAME='designs') AS products_designs,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='design_name') AS orders_design,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_referred') AS idx_perf,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='team_income_events') AS t_team_income,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='withdrawal_requests') AS t_withdrawals,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cashback_entitlements') AS t_cashback,
      (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='setting_audit_logs') AS t_audit
  `);
  const r = rows[0];
  return Object.values(r).every((v) => Number(v) > 0);
}

async function runMigrationsIfStale() {
  let current;
  try {
    current = await schemaIsCurrent();
  } catch (err) {
    // INFORMATION_SCHEMA probes failing usually means the DB itself is
    // unreachable — let the normal pool error path report it.
    console.error('❌ Auto-migration schema check failed:', err.message);
    throw err;
  }

  if (current) {
    console.log('✅ Database schema is up to date (no migration needed)');
    return;
  }

  console.log('⚙️  Schema outdated — running non-destructive migration 003_production_income_rework.sql ...');
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');

  // Dedicated connection: the shared pool has multipleStatements disabled.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blisswell',
    port: process.env.DB_PORT || 3306,
    socketPath: process.env.DB_SOCKET || undefined,
    multipleStatements: true
  });

  try {
    // The file itself is wrapped in START TRANSACTION / COMMIT, so a
    // mid-file failure rolls back the schema changes atomically.
    await conn.query(sql);
    console.log('✅ Migration 003_production_income_rework.sql applied successfully');
  } finally {
    await conn.end();
  }
}

module.exports = { runMigrationsIfStale, schemaIsCurrent };