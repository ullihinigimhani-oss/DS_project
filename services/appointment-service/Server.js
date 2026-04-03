const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'appointment-service', status: 'running', port: PORT });
});

// Get all appointments
app.get('/api/appointments', (req, res) => {
  // TODO: Implement database query
  res.json({ message: 'Appointment service - Get all appointments', status: 'pending' });
});

// Book appointment
app.post('/api/appointments', (req, res) => {
  // TODO: Implement appointment booking
  res.json({ message: 'Appointment service - Book appointment', status: 'pending' });
});

// Reschedule appointment
app.put('/api/appointments/:id', (req, res) => {
  // TODO: Implement appointment rescheduling
  res.json({ message: 'Appointment service - Reschedule appointment', appointmentId: req.params.id });
});

// Cancel appointment
app.delete('/api/appointments/:id', (req, res) => {
  // TODO: Implement appointment cancellation
  res.json({ message: 'Appointment service - Cancel appointment', appointmentId: req.params.id });
});

app.listen(PORT, () => {
  console.log(`Appointment Service running on port ${PORT}`);
});
