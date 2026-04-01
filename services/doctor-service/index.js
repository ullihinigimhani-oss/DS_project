const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'doctor-service', status: 'running', port: PORT });
});

// Get all doctors
app.get('/api/doctors', (req, res) => {
  // TODO: Implement database query
  res.json({ message: 'Doctor service - Get all doctors', status: 'pending' });
});

// Get doctor by ID
app.get('/api/doctors/:id', (req, res) => {
  // TODO: Implement database query
  res.json({ message: 'Doctor service - Get doctor by ID', doctorId: req.params.id });
});

// Create doctor
app.post('/api/doctors', (req, res) => {
  // TODO: Implement doctor creation
  res.json({ message: 'Doctor service - Create doctor', status: 'pending' });
});

// Upload verification documents
app.post('/api/doctors/:id/verification', (req, res) => {
  // TODO: Implement file upload
  res.json({ message: 'Doctor service - Upload verification', status: 'pending' });
});

app.listen(PORT, () => {
  console.log(`Doctor Service running on port ${PORT}`);
});
