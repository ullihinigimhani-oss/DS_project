const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'running', port: PORT });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  // TODO: Implement authentication logic
  res.json({ message: 'Auth service - Login endpoint', status: 'pending' });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
  // TODO: Implement registration logic
  res.json({ message: 'Auth service - Register endpoint', status: 'pending' });
});

// Verify token endpoint
app.post('/api/auth/verify', (req, res) => {
  // TODO: Implement token verification logic
  res.json({ message: 'Auth service - Verify endpoint', status: 'pending' });
});

app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
