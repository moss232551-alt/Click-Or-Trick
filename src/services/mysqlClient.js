const mysql = require('mysql2/promise');
const config = require('../config');

let pool;

const getPool = () => {
  if (pool) return pool;
  pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    connectionLimit: config.mysql.connectionLimit,
    waitForConnections: true,
    multipleStatements: false,
    namedPlaceholders: true,
  });
  return pool;
};

const run = async (sql, params = {}) => {
  const [rows] = await getPool().execute(sql, params);
  return rows;
};

const ensureSchema = async () => {
  const poolInstance = getPool();

  await poolInstance.execute(`
    CREATE TABLE IF NOT EXISTS challenges (
      id VARCHAR(50) PRIMARY KEY,
      type VARCHAR(16) NOT NULL,
      difficulty VARCHAR(16) NOT NULL,
      target VARCHAR(32) NOT NULL,
      tactic VARCHAR(32) NOT NULL,
      payload JSON NOT NULL,
      source VARCHAR(16) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await poolInstance.execute(`
    CREATE TABLE IF NOT EXISTS results (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      challenge_id VARCHAR(50) NOT NULL,
      player_id VARCHAR(64),
      player_answer ENUM('safe','suspicious','malicious') NOT NULL,
      correct_answer ENUM('safe','suspicious','malicious'),
      player_explanation TEXT,
      ai_feedback JSON,
      response_time_ms INT UNSIGNED,
      score_delta INT,
      metadata JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_results_challenge (challenge_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const safeAlter = async (statement) => {
    try {
      await poolInstance.execute(statement);
    } catch (error) {
      if (!/Duplicate (column|key) name/i.test(error.message)) {
        throw error;
      }
    }
  };

  await safeAlter(`ALTER TABLE results ADD COLUMN IF NOT EXISTS player_explanation TEXT NULL`);
  await safeAlter(`ALTER TABLE results ADD COLUMN IF NOT EXISTS ai_feedback JSON NULL`);
  await safeAlter(`ALTER TABLE challenges ADD COLUMN IF NOT EXISTS level_id VARCHAR(20) NULL`);
  await safeAlter(`CREATE INDEX IF NOT EXISTS idx_challenges_level ON challenges(level_id)`);
  await poolInstance.execute(`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      provider VARCHAR(32) NOT NULL,
      provider_user_id VARCHAR(128) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_provider_user (provider, provider_user_id),
      CONSTRAINT fk_oauth_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await poolInstance.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await poolInstance.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id BIGINT UNSIGNED NOT NULL,
      display_name VARCHAR(50),
      avatar_url VARCHAR(255),
      bio VARCHAR(255),
      level INT UNSIGNED DEFAULT 1,
      xp INT UNSIGNED DEFAULT 0,
      score INT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_profiles_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await poolInstance.execute(`
    CREATE TABLE IF NOT EXISTS level_progress (
      user_id BIGINT UNSIGNED NOT NULL,
      level_id VARCHAR(20) NOT NULL,
      status ENUM('locked','unlocked','completed') NOT NULL DEFAULT 'locked',
      best_score INT DEFAULT 0,
      last_played TIMESTAMP NULL,
      PRIMARY KEY (user_id, level_id),
      CONSTRAINT fk_progress_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};

module.exports = {
  getPool,
  run,
  ensureSchema,
};
