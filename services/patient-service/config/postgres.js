const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'patient_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle patient DB client', err);
  process.exit(-1);
});

const initializeDatabase = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      description TEXT,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_medical_records_patient
    ON medical_records(patient_id);

    CREATE TABLE IF NOT EXISTS patient_profiles (
      patient_id VARCHAR(255) PRIMARY KEY,
      blood_type VARCHAR(10),
      allergies TEXT,
      emergency_contact VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Patient DB initialized');
};

const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Patient DB query error:', error.message);
    throw error;
  }
};

module.exports = { query, pool, initializeDatabase };
