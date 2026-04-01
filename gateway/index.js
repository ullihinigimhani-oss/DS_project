const express = require('express');
const httpProxy = require('http-proxy');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Service URLs from environment
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  patient: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
  doctor: process.env.DOCTOR_SERVICE_URL || 'http://localhost:3003',
  appointment: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3004',
  telemedicine: process.env.TELEMEDICINE_SERVICE_URL || 'http://localhost:3005',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
  ai: process.env.AI_SERVICE_URL || 'http://localhost:3008',
};

// Create proxy instances
const createProxy = (service) => httpProxy.createProxyServer({ target: service });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Gateway is running', timestamp: new Date().toISOString() });
});

// Route requests to appropriate services
app.use('/api/auth', createProxy(services.auth).web);
app.use('/api/patients', createProxy(services.patient).web);
app.use('/api/doctors', createProxy(services.doctor).web);
app.use('/api/appointments', createProxy(services.appointment).web);
app.use('/api/telemedicine', createProxy(services.telemedicine).web);
app.use('/api/payments', createProxy(services.payment).web);
app.use('/api/notifications', createProxy(services.notification).web);
app.use('/api/ai-symptoms', createProxy(services.ai).web);

// Error handling
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({ error: 'Gateway Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Connected services:', services);
});
