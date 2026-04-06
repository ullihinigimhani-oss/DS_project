const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'ai_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle AI DB client', err);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initializeDatabase = async () => {
  const maxRetries = parseInt(process.env.DB_INIT_MAX_RETRIES, 10) || 10;
  const retryDelayMs = parseInt(process.env.DB_INIT_RETRY_DELAY_MS, 10) || 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pool.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        CREATE TABLE IF NOT EXISTS symptom_analyses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(255),
          symptoms TEXT NOT NULL,
          detected_symptoms JSONB,
          possible_conditions JSONB,
          confidence DECIMAL(5, 4),
          recommendation TEXT,
          raw_response JSONB,
          analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_analyses_user ON symptom_analyses(user_id);
        CREATE INDEX IF NOT EXISTS idx_analyses_time ON symptom_analyses(analyzed_at DESC);
      `);

      console.log('AI Symptom DB initialized');
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`AI DB initialization failed after ${maxRetries} attempts`);
        throw error;
      }

      console.warn(
        `AI DB not ready yet (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying in ${retryDelayMs}ms...`
      );
      await sleep(retryDelayMs);
    }
  }
};

const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('AI DB query error:', error.message);
    throw error;
  }
};

module.exports = {
  query,
  pool,
  initializeDatabase,
};
