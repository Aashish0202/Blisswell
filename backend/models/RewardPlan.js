const pool = require('../config/db');
const { normalizeCounts } = require('../services/rewardLogic');

// Milestone reward plans (Bike Fund 3x3, Car Fund 5x5, …).
// Reference SQL for production: migrations/009_milestone_rewards.sql
// (ensureSchema() applies the same thing idempotently at boot).

const SEED_PLANS = [
  { name: 'Bike Fund', matrix_label: '3x3', icon: 'bike', required_counts: [3, 9, 27, 81, 243, 729], reward_amount: 100000, sequence_order: 1 },
  { name: 'Car Fund',  matrix_label: '5x5', icon: 'car',  required_counts: [5, 25, 125, 625, 3125, 15625], reward_amount: 900000, sequence_order: 2 }
];

function hydrate(row) {
  if (!row) return row;
  return {
    ...row,
    required_counts: normalizeCounts(row.required_counts),
    reward_amount: parseFloat(row.reward_amount) || 0,
    sequence_order: Number(row.sequence_order) || 0,
    is_active: !!row.is_active
  };
}

const RewardPlan = {
  SEED_PLANS,

  async ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reward_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        matrix_label VARCHAR(20) NOT NULL,
        icon VARCHAR(20) NOT NULL DEFAULT 'gift',
        required_counts LONGTEXT NOT NULL,
        reward_amount DECIMAL(12,2) NOT NULL,
        sequence_order INT NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_reward_plans_seq (is_active, sequence_order)
      ) DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_reward_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reward_plan_id INT NOT NULL,
        level_counts LONGTEXT NOT NULL,
        progress_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
        status ENUM('LOCKED','IN_PROGRESS','ACHIEVED','PAID') NOT NULL DEFAULT 'IN_PROGRESS',
        reward_amount DECIMAL(12,2) NULL,
        achieved_at DATETIME NULL,
        paid_at DATETIME NULL,
        transaction_id INT NULL,
        last_computed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_reward (user_id, reward_plan_id),
        INDEX idx_urp_plan_status (reward_plan_id, status),
        INDEX idx_urp_status_achieved (status, achieved_at)
      ) DEFAULT CHARSET=utf8mb4
    `);

    // Add 'reward' to wallet_transactions.type, preserving whatever values
    // this database already has (prod and local enums have drifted before).
    const [[col]] = await pool.query(
      `SELECT COLUMN_TYPE AS t FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wallet_transactions' AND COLUMN_NAME = 'type'`
    );
    if (col && /^enum\(/i.test(col.t) && !String(col.t).includes("'reward'")) {
      const newType = String(col.t).replace(/\)\s*$/, ",'reward')");
      await pool.query(`ALTER TABLE wallet_transactions MODIFY type ${newType} NOT NULL`);
      console.log("✅ wallet_transactions.type now includes 'reward'");
    }

    // Seed the two plans once (only if the table is empty — admin edits win).
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM reward_plans');
    if (Number(n) === 0) {
      for (const p of SEED_PLANS) {
        await pool.query(
          `INSERT INTO reward_plans (name, matrix_label, icon, required_counts, reward_amount, sequence_order, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [p.name, p.matrix_label, p.icon, JSON.stringify(p.required_counts), p.reward_amount, p.sequence_order]
        );
      }
      console.log('✅ Seeded reward plans: Bike Fund (3x3), Car Fund (5x5)');
    }
  },

  async getAll(connection = pool) {
    const [rows] = await connection.query('SELECT * FROM reward_plans ORDER BY sequence_order, id');
    return rows.map(hydrate);
  },

  async getActive(connection = pool) {
    const [rows] = await connection.query(
      'SELECT * FROM reward_plans WHERE is_active = 1 ORDER BY sequence_order, id'
    );
    return rows.map(hydrate);
  },

  async findById(id, connection = pool) {
    const [rows] = await connection.execute('SELECT * FROM reward_plans WHERE id = ?', [id]);
    return hydrate(rows[0]);
  },

  async create(data, connection = pool) {
    const [r] = await connection.execute(
      `INSERT INTO reward_plans (name, matrix_label, icon, required_counts, reward_amount, sequence_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.name, data.matrix_label, data.icon || 'gift', JSON.stringify(data.required_counts),
       data.reward_amount, data.sequence_order, data.is_active ? 1 : 0]
    );
    return r.insertId;
  },

  async update(id, data, connection = pool) {
    const [r] = await connection.execute(
      `UPDATE reward_plans
          SET name = ?, matrix_label = ?, icon = ?, required_counts = ?, reward_amount = ?,
              sequence_order = ?, is_active = ?
        WHERE id = ?`,
      [data.name, data.matrix_label, data.icon || 'gift', JSON.stringify(data.required_counts),
       data.reward_amount, data.sequence_order, data.is_active ? 1 : 0, id]
    );
    return r.affectedRows > 0;
  },

  async countPayouts(id, connection = pool) {
    const [[row]] = await connection.execute(
      "SELECT COUNT(*) AS n FROM user_reward_progress WHERE reward_plan_id = ? AND status IN ('ACHIEVED','PAID')",
      [id]
    );
    return Number(row.n) || 0;
  },

  async remove(id, connection = pool) {
    await connection.execute('DELETE FROM user_reward_progress WHERE reward_plan_id = ?', [id]);
    const [r] = await connection.execute('DELETE FROM reward_plans WHERE id = ?', [id]);
    return r.affectedRows > 0;
  }
};

module.exports = RewardPlan;
