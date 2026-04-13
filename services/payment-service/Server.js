const express = require('express');
require('dotenv').config();

const { initializeDatabase } = require('./config/postgres');
const { initializeProducer } = require('./config/kafka');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());

// Initialize database on startup
initializeDatabase().then(() => {
    console.log('Database initialized successfully');
}).catch(err => {
    console.error('Failed to initialize database:', err);
});

// Initialize Kafka producer
initializeProducer();

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'payment-service', status: 'running', port: PORT });
});

// API Routes
const paymentRoutes = require('./routes/paymentRoutes');

// Mount routes with /api/v1 prefix
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/payments', paymentRoutes);

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
    console.log(`Payment Service running on port ${PORT}`);
});
