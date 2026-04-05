const axios = require('axios');
const db = require('../config/postgres');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, sessionSymptoms, userId } = req.body;
    if (!symptoms) {
      return res.status(400).json({ success: false, message: 'Symptoms are required' });
    }

    let responseData;
    try {
      const response = await axios.post(`${ML_SERVICE_URL}/api/symptoms/analyze`, {
        symptoms,
        sessionSymptoms: sessionSymptoms || [],
      });
      responseData = response.data;
    } catch (mlError) {
      console.error(
        'ML service error, using fallback:',
        mlError.response?.status || mlError.code || mlError.message
      );
      responseData = {
        success: true,
        data: {
          symptoms,
          detectedSymptoms: [],
          possibleConditions: [],
          confidence: 0,
          recommendation:
            'The AI analysis service is temporarily unavailable. Please consult a healthcare professional for evaluation.',
        },
      };
    }

    try {
      const d = responseData.data || {};
      await db.query(
        `INSERT INTO symptom_analyses
            (user_id, symptoms, detected_symptoms, possible_conditions, confidence, recommendation, raw_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId || null,
          Array.isArray(symptoms) ? symptoms.join(', ') : String(symptoms),
          JSON.stringify(d.detectedSymptoms || []),
          JSON.stringify(d.possibleConditions || []),
          d.confidence || null,
          d.recommendation || null,
          JSON.stringify(responseData),
        ]
      );
    } catch (dbErr) {
      console.warn('Could not persist symptom analysis:', dbErr.message);
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error analyzing symptoms:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAnalysisHistory = async (req, res) => {
  try {
    const { userId, limit = 20 } = req.query;
    const params = [];
    let whereClause = '';

    if (userId) {
      params.push(userId);
      whereClause = 'WHERE user_id = $1';
    }

    params.push(parseInt(limit, 10) || 20);
    const result = await db.query(
      `SELECT id, user_id, symptoms, detected_symptoms, possible_conditions, confidence, recommendation, analyzed_at
       FROM symptom_analyses
       ${whereClause}
       ORDER BY analyzed_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { analyzeSymptoms, getAnalysisHistory };
