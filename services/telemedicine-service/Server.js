const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const client = require('prom-client');

const { initializeDatabase } = require('./config/postgres');

dotenv.config();

const promRegister = new client.Registry();
client.collectDefaultMetrics({ register: promRegister });

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const telemedicineRoutes = require('./routes/telemedicineRoutes');
app.use('/api/telemedicine', telemedicineRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'telemedicine-service',
    status: 'running',
    port: PORT,
    databaseHost: process.env.DB_HOST || 'postgres-telemedicine',
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const startServer = async () => {
  await initializeDatabase();

  server.listen(PORT, () => {
    console.log(`Telemedicine Service running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start telemedicine service:', err);
  process.exit(1);
});

module.exports = server;
