const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'telemedicine_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle telemedicine DB client', err);
  process.exit(-1);
});

const initializeDatabase = async () => {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS telemedicine_sessions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      appointment_id   VARCHAR(255) NOT NULL UNIQUE,
      patient_id       VARCHAR(255) NOT NULL,
      doctor_id        VARCHAR(255) NOT NULL,
      meeting_room     VARCHAR(255) NOT NULL,
      meeting_url      TEXT NOT NULL,
      status           VARCHAR(20) DEFAULT 'scheduled',
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at       TIMESTAMP,
      ended_at         TIMESTAMP,
      CONSTRAINT chk_session_status CHECK (status IN ('scheduled','active','ended'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_appointment ON telemedicine_sessions(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_patient ON telemedicine_sessions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_doctor ON telemedicine_sessions(doctor_id);
  `);

  console.log('Telemedicine DB tables initialized');
};

const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Telemedicine DB query error:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  initializeDatabase,
};
