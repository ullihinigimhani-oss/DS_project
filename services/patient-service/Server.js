const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'patient-service', status: 'running', port: PORT });
});

// Get all patients
app.get('/api/patients', (req, res) => {
  // TODO: Implement database query
  res.json({ message: 'Patient service - Get all patients', status: 'pending' });
});

// Get patient by ID
app.get('/api/patients/:id', (req, res) => {
  // TODO: Implement database query
  res.json({ message: 'Patient service - Get patient by ID', patientId: req.params.id });
});

// Create patient
app.post('/api/patients', (req, res) => {
  // TODO: Implement patient creation
  res.json({ message: 'Patient service - Create patient', status: 'pending' });
});

// Upload medical records
app.post('/api/patients/:id/medical-records', (req, res) => {
  // TODO: Implement file upload
  res.json({ message: 'Patient service - Upload medical records', status: 'pending' });
});

app.listen(PORT, () => {
  console.log(`Patient Service running on port ${PORT}`);
});
