const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'doctor_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

/**
 * Creates the doctor-service tables on startup if they do not already exist.
 */
const initializeDatabase = async () => {
  const createTablesQuery = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      birthdate DATE,
      address TEXT,
      emergency_contact VARCHAR(255),
      weight DECIMAL(10, 2),
      gender VARCHAR(50),
      user_type VARCHAR(50) NOT NULL DEFAULT 'patient',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id VARCHAR(255),
      actor_email VARCHAR(255),
      actor_name VARCHAR(255),
      action VARCHAR(255) NOT NULL,
      resource_type VARCHAR(255),
      resource_id VARCHAR(255),
      details JSONB,
      ip_address VARCHAR(100),
      status VARCHAR(50) NOT NULL DEFAULT 'success',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS verification_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id VARCHAR(255) NOT NULL,
      document_type VARCHAR(50) NOT NULL,
      document_url TEXT NOT NULL,
      public_id TEXT,
      file_name VARCHAR(255),
      file_size BIGINT,
      uploaded_at TIMESTAMP,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'submitted',
      CONSTRAINT chk_doc_type CHECK (
        document_type IN ('license', 'government_id', 'credentials', 'insurance')
      )
    );

    CREATE INDEX IF NOT EXISTS idx_vdocs_doctor ON verification_documents(doctor_id);

    CREATE TABLE IF NOT EXISTS verification_status (
      doctor_id VARCHAR(255) PRIMARY KEY,
      status VARCHAR(50) DEFAULT 'pending',
      documents_submitted INTEGER DEFAULT 0,
      total_required INTEGER DEFAULT 4,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at TIMESTAMP,
      approved_at TIMESTAMP,
      rejected_at TIMESTAMP,
      rejection_reason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_verification_status_status ON verification_status(status);

    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id VARCHAR(255) NOT NULL UNIQUE,
      schedule_type VARCHAR(20) NOT NULL DEFAULT 'recurring'
        CONSTRAINT chk_schedule_type CHECK (schedule_type IN ('recurring', 'reset')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sched_doctor ON doctor_schedules(doctor_id);

    CREATE TABLE IF NOT EXISTS doctor_schedule_slots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      schedule_id UUID NOT NULL REFERENCES doctor_schedules(id) ON DELETE CASCADE,
      doctor_id VARCHAR(255) NOT NULL,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      week_start DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_slots_schedule ON doctor_schedule_slots(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_slots_doctor ON doctor_schedule_slots(doctor_id);

    CREATE TABLE IF NOT EXISTS doctor_profiles (
      doctor_id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      specialization VARCHAR(255),
      consultation_fee DECIMAL(10, 2),
      bio TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id VARCHAR(255) NOT NULL,
      patient_id VARCHAR(255) NOT NULL,
      appointment_id VARCHAR(255),
      doctor_name VARCHAR(255),
      patient_name VARCHAR(255),
      medications JSONB NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
  `;

  await pool.query(createTablesQuery);
  console.log('Doctor DB tables initialized');
};

const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('DB query error:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  initializeDatabase,
};
