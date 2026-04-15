const { Pool } = require('pg');
const config = require('./database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const initializeDatabase = async () => {
    try {
        const createEnumQuery = `
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
                    CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
                END IF;
            END$$;`;
        await pool.query(createEnumQuery);

        // Create payments table if it does not already exist (never drops existing data)
        const createTableQuery = `
        CREATE TABLE IF NOT EXISTS payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            appointment_id VARCHAR(255),
            slot_id VARCHAR(255) NOT NULL,
            patient_id VARCHAR(255) NOT NULL,
            amount NUMERIC(10, 2) NOT NULL,
            status payment_status DEFAULT 'PENDING',
            transaction_id VARCHAR(255),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`;

        await pool.query(createTableQuery);
        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
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

module.exports = {
    query,
    pool,
    initializeDatabase,
};
