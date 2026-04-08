const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'notification_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle notification DB client', err);
  process.exit(-1);
});

const initializeDatabase = async (retries = 10, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          data JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
      `);

      console.log('[DB] Notifications table ready');
      return;
    } catch (err) {
      console.warn(`[DB] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

module.exports = { pool, initializeDatabase };
