const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'appointment_db',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password',
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle appointment DB client', err);
    process.exit(-1);
});

const initializeDatabase = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS appointments (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id       VARCHAR(255) NOT NULL,
            doctor_id        VARCHAR(255) NOT NULL,
            slot_id          UUID,
            appointment_date DATE NOT NULL,
            start_time       TIME NOT NULL,
            end_time         TIME NOT NULL,
            status           VARCHAR(20) DEFAULT 'pending',
            reason           TEXT,
            notes            TEXT,
            doctor_name      VARCHAR(255),
            patient_name     VARCHAR(255),
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_active_booking
            ON appointments(doctor_id, appointment_date, start_time)
            WHERE status != 'cancelled';

        CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_doctor  ON appointments(doctor_id);
    `);

    await pool.query(`
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(30);
        ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'pending';
        ALTER TABLE appointments DROP CONSTRAINT IF EXISTS chk_appt_status;
        ALTER TABLE appointments ADD CONSTRAINT chk_appt_status
            CHECK (status IN ('pending','confirmed','cancelled','completed'));
        ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_telemedicine BOOLEAN DEFAULT FALSE;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS appointment_messages (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
            sender_id      VARCHAR(255) NOT NULL,
            sender_role    VARCHAR(20) NOT NULL CHECK (sender_role IN ('patient','doctor')),
            message        TEXT NOT NULL,
            sent_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_messages_appointment ON appointment_messages(appointment_id);
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS prescriptions (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            appointment_id   UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
            doctor_id        VARCHAR(255) NOT NULL,
            patient_id       VARCHAR(255) NOT NULL,
            doctor_name      VARCHAR(255),
            patient_name     VARCHAR(255),
            diagnosis        TEXT NOT NULL,
            notes            TEXT,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_uq_prescription_appointment
            ON prescriptions(appointment_id);
        CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor  ON prescriptions(doctor_id);
        CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);

        CREATE TABLE IF NOT EXISTS prescription_drugs (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            prescription_id  UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
            rxcui            VARCHAR(50),
            drug_name        TEXT NOT NULL,
            strength         VARCHAR(100),
            dosage_form      VARCHAR(100),
            frequency        VARCHAR(50) NOT NULL,
            duration         VARCHAR(100) NOT NULL,
            instructions     TEXT,
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_presc_drugs_prescription ON prescription_drugs(prescription_id);
    `);

    console.log('Appointment DB tables initialized');
};

const query = async (text, params) => {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('Appointment DB query error:', error.message);
        throw error;
    }
};

module.exports = { query, pool, initializeDatabase };
