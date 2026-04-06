/**
 * Database Configuration
 */

const config = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'auth_db',
    username: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
  },
  production: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'postgres',
    dialectOptions: {
      ssl: true,
    },
  },
};

module.exports = config;
