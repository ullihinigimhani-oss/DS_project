const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const proxy = require('express-http-proxy');
const client = require('prom-client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const gatewayRequests = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total HTTP requests handled by the API gateway',
  labelNames: ['method', 'route', 'status_code'],
});

register.registerMetric(gatewayRequests);

const parseCorsOrigins = (origins) =>
  (origins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(morgan('dev'));
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

const trackGatewayRequest = (route) => (req, res, next) => {
  res.on('finish', () => {
    gatewayRequests.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });
  });
  next();
};

const createProxy = (serviceUrl) => proxy(serviceUrl, {
  proxyReqPathResolver(req) {
    return req.originalUrl;
  },
  proxyErrorHandler(err, res) {
    console.error('Gateway proxy error:', err.message);
    res.status(502).json({
      success: false,
      message: 'Upstream service unavailable',
      error: err.message,
    });
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    status: 'running',
    port: String(PORT),
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    next(error);
  }
});

// Route requests to appropriate services
app.use('/api/auth', trackGatewayRequest('/api/auth'), createProxy(services.auth));
app.use('/api/patients', trackGatewayRequest('/api/patients'), createProxy(services.patient));
app.use('/api/doctors', trackGatewayRequest('/api/doctors'), createProxy(services.doctor));
app.use('/api/appointments', trackGatewayRequest('/api/appointments'), createProxy(services.appointment));
app.use('/api/telemedicine', trackGatewayRequest('/api/telemedicine'), createProxy(services.telemedicine));
app.use('/api/payments', trackGatewayRequest('/api/payments'), createProxy(services.payment));
app.use('/api/notifications', trackGatewayRequest('/api/notifications'), createProxy(services.notification));
app.use('/api/ai-symptoms', trackGatewayRequest('/api/ai-symptoms'), createProxy(services.ai));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Gateway route not found',
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Gateway error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: 'Gateway error',
    error: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Connected services:', services);
});
