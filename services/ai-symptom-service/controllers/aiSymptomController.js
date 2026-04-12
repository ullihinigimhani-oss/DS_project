const axios = require('axios');
const db = require('../config/postgres');
const {
  PRELIMINARY_GUIDANCE_NOTICE,
  generateGeminiSymptomGuidance,
} = require('../services/geminiSymptomService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

function normalizeSymptomsInput(symptoms) {
  if (Array.isArray(symptoms)) {
    return symptoms.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(symptoms || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFallbackGuidance(symptoms) {
  return {
    success: true,
    data: {
      symptoms,
      detectedSymptoms: symptoms,
      possibleConditions: [],
      confidence: 0,
      recommendation: `${PRELIMINARY_GUIDANCE_NOTICE} The AI analysis service is temporarily unavailable. Please consult a healthcare professional for evaluation.`,
      guidanceType: 'preliminary_symptom_guidance',
      disclaimer: PRELIMINARY_GUIDANCE_NOTICE,
      consultationAdvice: {
        level: 'routine',
        risk: 35,
        message: 'Please arrange a healthcare review if symptoms persist or worsen.',
        warningSigns: [],
      },
      selfCare: [],
      whenToSeekCare: [],
      source: 'fallback',
    },
  };
}

function normalizeMlResponse(responseData, symptoms) {
  const data = responseData?.data || {};
  const possibleConditions = Array.isArray(data.possibleConditions)
    ? data.possibleConditions.map((condition) => ({
        ...condition,
        confidencePercent:
          typeof condition?.confidencePercent === 'number'
            ? condition.confidencePercent
            : Math.round((Number(condition?.confidence || 0) || 0) * 1000) / 10,
      }))
    : [];

  return {
    success: true,
    data: {
      ...data,
      symptoms,
      detectedSymptoms: Array.isArray(data.detectedSymptoms) ? data.detectedSymptoms : symptoms,
      possibleConditions,
      confidence: Number(data.confidence || 0),
      recommendation: `${PRELIMINARY_GUIDANCE_NOTICE} ${String(data.recommendation || '').trim()}`.trim(),
      guidanceType: 'preliminary_symptom_guidance',
      disclaimer: PRELIMINARY_GUIDANCE_NOTICE,
      source: 'ml-service',
    },
  };
}

const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, sessionSymptoms, userId } = req.body;
    if (!symptoms) {
      return res.status(400).json({ success: false, message: 'Symptoms are required' });
    }

    const normalizedSymptoms = normalizeSymptomsInput(symptoms);
    let responseData;

    try {
      responseData = await generateGeminiSymptomGuidance({
        symptoms: normalizedSymptoms,
        sessionSymptoms: sessionSymptoms || [],
      });
    } catch (geminiError) {
      console.error('Gemini guidance failed, falling back to ML service:', geminiError.message);

      try {
        const response = await axios.post(`${ML_SERVICE_URL}/api/symptoms/analyze`, {
          symptoms: normalizedSymptoms,
          sessionSymptoms: sessionSymptoms || [],
        });
        responseData = normalizeMlResponse(response.data, normalizedSymptoms);
      } catch (mlError) {
        console.error(
          'ML service error, using fallback:',
          mlError.response?.status || mlError.code || mlError.message
        );
        responseData = buildFallbackGuidance(normalizedSymptoms);
      }
    }

    try {
      const d = responseData.data || {};
      await db.query(
        `INSERT INTO symptom_analyses
            (user_id, symptoms, detected_symptoms, possible_conditions, confidence, recommendation, raw_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId || null,
          normalizedSymptoms.join(', '),
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
