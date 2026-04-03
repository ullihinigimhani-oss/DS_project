const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'telemedicine-service', status: 'running', port: PORT });
});

// Get video consultation room
app.post('/api/telemedicine/start-consultation', (req, res) => {
  // TODO: Implement video room creation
  res.json({ message: 'Telemedicine service - Start consultation', roomUrl: process.env.JITSI_BASE_URL });
});

// End consultation
app.post('/api/telemedicine/end-consultation', (req, res) => {
  // TODO: Implement consultation ending
  res.json({ message: 'Telemedicine service - End consultation', status: 'pending' });
});

// Get consultation history
app.get('/api/telemedicine/history/:patientId', (req, res) => {
  // TODO: Implement history retrieval
  res.json({ message: 'Telemedicine service - Get consultation history', patientId: req.params.patientId });
});

app.listen(PORT, () => {
  console.log(`Telemedicine Service running on port ${PORT}`);
});
