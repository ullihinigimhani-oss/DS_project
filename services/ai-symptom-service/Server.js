const express = require('express');
require('dotenv').config();
const { initializeDatabase } = require('./config/postgres');
const aiSymptomRoutes = require('./routes/aiSymptomRoutes');

const app = express();
const PORT = process.env.PORT || 3008;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'ai-symptom-service', status: 'running', port: PORT });
});

app.use('/api/ai-symptoms', aiSymptomRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const startServer = async () => {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`AI Symptom Service running on port ${PORT}`);
      console.log(`ML Service URL: ${ML_SERVICE_URL}`);
    });
  } catch (error) {
    console.error('Failed to start ai-symptom-service:', error.message);
    process.exit(1);
  }
};

startServer();
