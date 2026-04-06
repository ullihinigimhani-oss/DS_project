const express = require('express');
const dotenv = require('dotenv');
const { initializeDatabase, pool } = require('./config/postgres');
const { initializeProducer, disconnectProducer } = require('./config/kafka');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const internalRoutes = require('./routes/internalRoutes');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const serviceConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbName: process.env.DB_NAME || 'auth_db',
  kafkaBroker: process.env.KAFKA_BROKER || 'localhost:9092',
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1/internal', internalRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'auth-service',
    status: 'running',
    port: PORT,
    environment: serviceConfig.nodeEnv,
    dependencies: {
      database: {
        host: serviceConfig.dbHost,
        port: serviceConfig.dbPort,
        name: serviceConfig.dbName,
      },
      kafka: {
        broker: serviceConfig.kafkaBroker,
      },
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
  });
});

let server;

const startServer = async () => {
  try {
    await initializeDatabase();
    await initializeProducer();

    server = app.listen(PORT, () => {
      console.log(`Auth Service running on port ${PORT}`);
      console.log('Docker configuration loaded:', serviceConfig);
    });
  } catch (error) {
    console.error('Failed to start auth service:', error.message);
    process.exit(1);
  }
};

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down auth service`);

  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    await disconnectProducer();
    await pool.end();
    console.log('Auth service stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

module.exports = {
  app,
  startServer,
};
