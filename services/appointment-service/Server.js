const express = require('express');
require('dotenv').config();

const { initializeDatabase } = require('./config/postgres');
const { startReminderScheduler } = require('./services/reminderScheduler');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// Initialize database on startup
initializeDatabase().then(() => {
    console.log('Database initialized successfully');
}).catch(err => {
    console.error('Failed to initialize database:', err);
});

// Start reminder scheduler
startReminderScheduler();

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'appointment-service', status: 'running', port: PORT });
});

// API Routes
const appointmentRoutes = require('./routes/appointmentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');

// Mount routes with /api/v1 prefix
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Appointment Service running on port ${PORT}`);
});
