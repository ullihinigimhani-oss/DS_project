const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const client = require('prom-client');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_BASE = process.env.UPLOAD_BASE || path.join(__dirname, 'uploads');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(UPLOAD_BASE, 'medical-records');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const promRegister = new client.Registry();
client.collectDefaultMetrics({ register: promRegister });

const loadModule = (modulePath) => {
  try {
    return require(modulePath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw error;
  }
};

const postgresConfig = loadModule('./config/postgres');
const initializeDatabase =
  postgresConfig && typeof postgresConfig.initializeDatabase === 'function'
    ? postgresConfig.initializeDatabase
    : null;

const patientRoutes = loadModule('./routes/patientRoutes');
const medicalRecordRoutes = loadModule('./routes/medicalRecordRoutes');

app.use('/uploads', express.static(UPLOAD_BASE));

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (patientRoutes) {
  app.use('/api/patients', patientRoutes);
} else {
  app.get('/api/patients', (req, res) => {
    res.json({
      message: 'Patient service - Get all patients',
      status: 'pending',
    });
  });

  app.get('/api/patients/:id', (req, res) => {
    res.json({
      message: 'Patient service - Get patient by ID',
      patientId: req.params.id,
    });
  });

  app.post('/api/patients', (req, res) => {
    res.status(501).json({
      message: 'Patient service - Create patient',
      status: 'pending',
    });
  });

  app.post('/api/patients/:id/medical-records', (req, res) => {
    res.status(501).json({
      message: 'Patient service - Upload medical records',
      patientId: req.params.id,
      uploadDir: UPLOAD_DIR,
      status: 'pending',
    });
  });
}

if (medicalRecordRoutes) {
  app.use('/api/v1/medical-records', medicalRecordRoutes);
}

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'patient-service',
    status: 'running',
    port: PORT,
    environment: NODE_ENV,
    uploads: {
      base: UPLOAD_BASE,
      medicalRecords: UPLOAD_DIR,
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
  });
});

let server;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initializeDatabaseWithRetry = async (attempts = 15, delayMs = 3000) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await initializeDatabase();
      return;
    } catch (error) {
      lastError = error;
      console.error(`Database initialization attempt ${attempt}/${attempts} failed: ${error.message}`);

      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
};

const startServer = async () => {
  try {
    if (initializeDatabase) {
      await initializeDatabaseWithRetry();
      console.log('Database initialized successfully');
    } else {
      console.log('Database initializer not found, starting without DB bootstrap');
    }

    server = app.listen(PORT, () => {
      console.log(`Patient Service running on port ${PORT}`);
      console.log('Docker configuration loaded:', {
        nodeEnv: NODE_ENV,
        uploadBase: UPLOAD_BASE,
        uploadDir: UPLOAD_DIR,
      });
    });
  } catch (error) {
    console.error('Failed to start patient service:', error.message);
    process.exit(1);
  }
};

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down patient service`);

  if (!server) {
    process.exit(0);
  }

  server.close(() => {
    console.log('Patient service stopped');
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
