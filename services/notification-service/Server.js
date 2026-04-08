const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const client = require('prom-client');

dotenv.config();

const { initializeDatabase } = require('./config/postgres');
const { initializeConsumer, disconnectConsumer } = require('./config/kafka');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 3007;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const smsEnabled = String(process.env.ENABLE_SMS || 'true').toLowerCase() === 'true';
const smsSenderId = process.env.SMSAPI_SENDER_ID || 'SMSAPI Demo';
const smsConfigured = Boolean(process.env.SMSAPI_TOKEN);

const promRegister = new client.Registry();
client.collectDefaultMetrics({ register: promRegister });

const notificationRequests = new client.Counter({
  name: 'notification_http_requests_total',
  help: 'Total HTTP requests handled by the notification service',
  labelNames: ['method', 'route', 'status_code'],
});

promRegister.registerMetric(notificationRequests);

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const trackRequest = (route) => (req, res, next) => {
  res.on('finish', () => {
    notificationRequests.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });

  next();
};

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'notification-service',
    status: 'running',
    port: String(PORT),
    timestamp: new Date().toISOString(),
    integrations: {
      databaseHost: process.env.DB_HOST || 'localhost',
      kafkaBroker: KAFKA_BROKER,
      smsEnabled,
      smsConfigured,
      smsSenderId,
    },
  });
});

app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', promRegister.contentType);
    res.end(await promRegister.metrics());
  } catch (error) {
    next(error);
  }
});

app.use('/api/notifications', trackRequest('/api/notifications'), notificationRoutes);

app.use((err, req, res, next) => {
  console.error('Notification service error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const server = app.listen(PORT, async () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log(`Database host configured: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`Kafka broker configured: ${KAFKA_BROKER}`);
  console.log(`SMS enabled: ${smsEnabled}`);
  try {
    await initializeDatabase();
    await initializeConsumer();
  } catch (error) {
    console.error('Failed to start notification service:', error.message);
    process.exit(1);
  }
});

const shutdown = async (signal) => {
  console.log(`${signal} received: shutting down notification service`);
  server.close(async () => {
    await disconnectConsumer();
    console.log('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = server;
