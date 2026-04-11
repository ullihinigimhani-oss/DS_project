const express = require('express');
require('dotenv').config();
const { initializeDatabase } = require('./config/postgres');
const doctorRoutes = require('./routes/doctorRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const publicDoctorRoutes = require('./routes/publicDoctorRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const { UPLOAD_DIR } = require('./utils/fileStorage');

const app = express();
const PORT = process.env.PORT || 3003;
let databaseReady = false;

app.use(express.json());
app.use('/uploads/doctor-verification', express.static(UPLOAD_DIR));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'doctor-service',
    status: 'running',
    port: PORT,
    database: databaseReady ? 'ready' : 'initializing',
  });
});

app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/public', publicDoctorRoutes);
app.use('/api/v1/schedule', scheduleRoutes);
app.use('/api/v1/verification', verificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const initializeDatabaseWithRetry = async (attempt = 1) => {
  try {
    await initializeDatabase();
    databaseReady = true;
    console.log('Doctor database is ready.');
  } catch (error) {
    databaseReady = false;
    const retryDelay = Math.min(attempt * 5000, 30000);
    console.error(
      `Doctor database initialization failed (attempt ${attempt}): ${error.message}. Retrying in ${retryDelay / 1000}s.`
    );
    setTimeout(() => {
      void initializeDatabaseWithRetry(attempt + 1);
    }, retryDelay);
  }
};

app.listen(PORT, () => {
  console.log(`Doctor Service running on port ${PORT}`);
  void initializeDatabaseWithRetry();
});
