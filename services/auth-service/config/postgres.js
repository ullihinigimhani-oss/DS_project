const { Pool } = require('pg');
const config = require('./database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env] || config.development;

const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.username,
  password: dbConfig.password,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(1);
});

const initializeDatabase = async (retries = 10, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const createTableQuery = `
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          user_type VARCHAR(50) DEFAULT 'patient',
          gender VARCHAR(20),
          weight NUMERIC(5,2),
          emergency_contact VARCHAR(20),
          address TEXT,
          birthdate DATE,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id UUID,
          actor_email VARCHAR(255),
          actor_name VARCHAR(255),
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50),
          resource_id VARCHAR(255),
          details JSONB,
          ip_address VARCHAR(45),
          status VARCHAR(20) DEFAULT 'success',
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      `;

      await pool.query(createTableQuery);
      console.log('Database tables initialized successfully');
      return;
    } catch (error) {
      console.error(`Error initializing database (attempt ${i + 1}/${retries}):`, error.message);
      if (i === retries - 1) throw error;
      console.log(`Waiting ${delay}ms before next attempt...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

const query = async (text, params) => {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

const getClient = async () => pool.connect();

module.exports = {
  query,
  getClient,
  pool,
  initializeDatabase,
};
