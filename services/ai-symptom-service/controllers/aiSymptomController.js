const db = require('../config/postgres');
const {
  PRELIMINARY_GUIDANCE_NOTICE,
  generateGeminiSymptomGuidance,
} = require('../services/geminiSymptomService');
const {
  analyzeWithCustomModel,
  shouldUsePrimaryModel,
} = require('../services/customSymptomModelService');

function normalizeSymptomsInput(symptoms) {
  if (Array.isArray(symptoms)) {
    return symptoms.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(symptoms || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildFallbackGuidance(symptoms, primaryModel) {
  return {
    success: true,
    data: {
      symptoms,
      detectedSymptoms: symptoms,
      possibleConditions: [],
      confidence: 0,
      recommendation: `${PRELIMINARY_GUIDANCE_NOTICE} The local symptom model could not confidently determine a result, and the Gemini fallback is currently unavailable. Please consult a healthcare professional for evaluation.`,
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
      primaryModel,
    },
  };
}

function parseAnalysisRow(row) {
  if (!row) return null;

  let rawResponse = null;

  if (row.raw_response) {
    try {
      rawResponse =
        typeof row.raw_response === 'string'
          ? JSON.parse(row.raw_response)
          : row.raw_response;
    } catch {
      rawResponse = null;
    }
  }

  const rawData = rawResponse?.data || {};
  const possibleConditions = rawData.possibleConditions || row.possible_conditions || [];
  const detectedSymptoms = rawData.detectedSymptoms || row.detected_symptoms || [];

  return {
    id: row.id,
    userId: row.user_id,
    analyzedAt: row.analyzed_at,
    symptoms: row.symptoms,
    detectedSymptoms,
    possibleConditions,
    confidence: rawData.confidence ?? row.confidence ?? 0,
    recommendation:
      rawData.recommendation ||
      row.recommendation ||
      PRELIMINARY_GUIDANCE_NOTICE,
    guidanceType:
      rawData.guidanceType || 'preliminary_symptom_guidance',
    disclaimer:
      rawData.disclaimer || PRELIMINARY_GUIDANCE_NOTICE,
    consultationAdvice: rawData.consultationAdvice || null,
    selfCare: rawData.selfCare || [],
    whenToSeekCare: rawData.whenToSeekCare || [],
    source: rawData.source || 'unknown',
    recommendedSpecialist:
      rawData.recommendedSpecialist ||
      rawData.primaryModel?.recommendedSpecialist ||
      'General Physician',
    severity:
      rawData.severity ||
      rawData.consultationAdvice?.level ||
      'routine',
    primaryModel: rawData.primaryModel || null,
  };
}

function canAccessPatientHistory(requestingUserId, requestingRole, patientId) {
  if (!requestingUserId || !patientId) return false;

  if (requestingUserId === patientId) return true;

  return ['doctor', 'admin'].includes(String(requestingRole || '').toLowerCase());
}

const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, sessionSymptoms } = req.body;
    const currentUserId = req.user?.userId;

    if (!symptoms) {
      return res.status(400).json({ success: false, message: 'Symptoms are required' });
    }

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'User context is required' });
    }

    const normalizedSymptoms = normalizeSymptomsInput(symptoms);
    const primaryModelResult = analyzeWithCustomModel({
      symptoms,
      sessionSymptoms: sessionSymptoms || [],
    });

    let responseData = primaryModelResult;

    if (!shouldUsePrimaryModel(primaryModelResult.data)) {
      try {
        responseData = await generateGeminiSymptomGuidance({
          symptoms: primaryModelResult.data.detectedSymptoms.length
            ? primaryModelResult.data.detectedSymptoms
            : normalizedSymptoms,
          sessionSymptoms: sessionSymptoms || [],
        });

        responseData.data.source = 'gemini-fallback';
        responseData.data.primaryModel = {
          source: primaryModelResult.data.source,
          confidence: primaryModelResult.data.confidence,
          possibleConditions: primaryModelResult.data.possibleConditions,
          recommendedSpecialist: primaryModelResult.data.recommendedSpecialist,
          severity: primaryModelResult.data.severity,
        };
      } catch (geminiError) {
        console.error('Gemini fallback failed, using safe local fallback:', geminiError.message);
        responseData = buildFallbackGuidance(
          primaryModelResult.data.detectedSymptoms.length
            ? primaryModelResult.data.detectedSymptoms
            : normalizedSymptoms,
          {
            source: primaryModelResult.data.source,
            confidence: primaryModelResult.data.confidence,
            possibleConditions: primaryModelResult.data.possibleConditions,
            recommendedSpecialist: primaryModelResult.data.recommendedSpecialist,
            severity: primaryModelResult.data.severity,
          }
        );
      }
    }

    try {
      const d = responseData.data || {};
      await db.query(
        `INSERT INTO symptom_analyses
            (user_id, symptoms, detected_symptoms, possible_conditions, confidence, recommendation, raw_response)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          currentUserId,
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
    const currentUserId = req.user?.userId;
    const { limit = 20 } = req.query;

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'User context is required' });
    }

    const params = [currentUserId, parseInt(limit, 10) || 20];
    const result = await db.query(
      `SELECT id, user_id, symptoms, detected_symptoms, possible_conditions, confidence, recommendation, analyzed_at
       FROM symptom_analyses
       WHERE user_id = $1
       ORDER BY analyzed_at DESC
       LIMIT $2`,
      params
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getLatestPatientAnalysis = async (req, res) => {
  try {
    const requestingUserId = req.user?.userId;
    const requestingRole = req.user?.userType;
    const { patientId } = req.params;

    if (!canAccessPatientHistory(requestingUserId, requestingRole, patientId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to view this patient analysis summary',
      });
    }

    const result = await db.query(
      `SELECT id, user_id, symptoms, detected_symptoms, possible_conditions, confidence, recommendation, raw_response, analyzed_at
       FROM symptom_analyses
       WHERE user_id = $1
       ORDER BY analyzed_at DESC
       LIMIT 1`,
      [patientId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({
      success: true,
      data: parseAnalysisRow(result.rows[0]),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { analyzeSymptoms, getAnalysisHistory, getLatestPatientAnalysis };
