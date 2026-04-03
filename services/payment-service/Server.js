const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'payment-service', status: 'running', port: PORT });
});

// Process payment
app.post('/api/payments/process', (req, res) => {
  // TODO: Implement payment processing
  res.json({ message: 'Payment service - Process payment', status: 'pending' });
});

// Get payment status
app.get('/api/payments/:transactionId', (req, res) => {
  // TODO: Implement payment status retrieval
  res.json({ message: 'Payment service - Get payment status', transactionId: req.params.transactionId });
});

// Refund payment
app.post('/api/payments/:transactionId/refund', (req, res) => {
  // TODO: Implement refund logic
  res.json({ message: 'Payment service - Refund payment', transactionId: req.params.transactionId });
});

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});
