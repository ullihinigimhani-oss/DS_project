const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3008;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ service: 'ai-symptom-service', status: 'running', port: PORT });
});

// Analyze symptoms
app.post('/api/ai-symptoms/analyze', async (req, res) => {
  try {
    // TODO: Implement symptom analysis with ML service
    const symptoms = req.body.symptoms || [];
    
    // Call ML service for analysis
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/api/symptoms/analyze`, { symptoms });
    
    res.json({ 
      message: 'AI Symptom Analysis', 
      symptoms: symptoms,
      analysis: mlResponse.data,
      status: 'pending' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get symptom history
app.get('/api/ai-symptoms/history/:patientId', (req, res) => {
  // TODO: Implement history retrieval
  res.json({ 
    message: 'AI Symptom Analysis History', 
    patientId: req.params.patientId, 
    status: 'pending' 
  });
});

app.listen(PORT, () => {
  console.log(`AI Symptom Service running on port ${PORT}`);
  console.log(`ML Service URL: ${ML_SERVICE_URL}`);
});
