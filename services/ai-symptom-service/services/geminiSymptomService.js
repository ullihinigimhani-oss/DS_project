const { GoogleGenAI } = require('@google/genai');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const PRELIMINARY_GUIDANCE_NOTICE =
  'This is preliminary symptom guidance only and not a final medical diagnosis. Please consult a qualified healthcare professional for confirmation and treatment.';

let aiClient = null;

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return aiClient;
}

function extractJsonObject(text) {
  const cleaned = String(text || '').trim();
  const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : cleaned;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Gemini did not return a JSON object');
  }

  const jsonText = candidate
    .slice(firstBrace, lastBrace + 1)
    .replace(/,\s*([}\]])/g, '$1');

  return JSON.parse(jsonText);
}

function normalizeDetectedSymptoms(symptoms) {
  if (!Array.isArray(symptoms)) return [];

  return symptoms
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizePossibleConditions(conditions) {
  if (!Array.isArray(conditions)) return [];

  return conditions
    .map((condition) => {
      const confidencePercent = Math.max(
        0,
        Math.min(100, Number(condition?.confidencePercent || condition?.confidence || 0))
      );

      return {
        name: String(condition?.name || condition?.condition || '').trim(),
        confidencePercent: Number(confidencePercent.toFixed(1)),
        reason: String(condition?.reason || '').trim(),
      };
    })
    .filter((condition) => condition.name)
    .slice(0, 5);
}

function buildRecommendation(geminiData) {
  const summary = String(geminiData?.summary || '').trim();
  const selfCare = Array.isArray(geminiData?.selfCare)
    ? geminiData.selfCare.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const whenToSeekCare = Array.isArray(geminiData?.whenToSeekCare)
    ? geminiData.whenToSeekCare.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  const normalizedSummary =
    summary &&
    summary.toLowerCase().includes('preliminary symptom guidance')
      ? summary
          .replace(/this is preliminary symptom guidance only[^.]*\.\s*/i, '')
          .trim()
      : summary;

  const segments = [PRELIMINARY_GUIDANCE_NOTICE];

  if (normalizedSummary) {
    segments.push(normalizedSummary);
  }

  if (selfCare.length) {
    segments.push(`Self-care suggestions: ${selfCare.join('; ')}`);
  }

  if (whenToSeekCare.length) {
    segments.push(`Seek medical care if: ${whenToSeekCare.join('; ')}`);
  }

  return segments
    .map((segment) => segment.trim().replace(/\.+$/g, ''))
    .filter(Boolean)
    .join('. ') + '.';
}

function buildConsultationAdvice(urgency, whenToSeekCare) {
  const riskMap = {
    urgent: 90,
    soon: 65,
    routine: 35,
    self_care: 15,
  };

  const guidanceMap = {
    urgent: 'Please seek urgent medical attention as soon as possible.',
    soon: 'Please arrange a prompt medical review.',
    routine: 'A routine doctor consultation would be appropriate if symptoms continue.',
    self_care: 'Home monitoring may be reasonable for now if symptoms stay mild.',
  };

  const normalizedUrgency = ['urgent', 'soon', 'routine', 'self_care'].includes(urgency)
    ? urgency
    : 'routine';
  const reasons = Array.isArray(whenToSeekCare)
    ? whenToSeekCare.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return {
    level: normalizedUrgency,
    risk: riskMap[normalizedUrgency],
    message: guidanceMap[normalizedUrgency],
    warningSigns: reasons,
  };
}

async function generateGeminiSymptomGuidance({ symptoms, sessionSymptoms }) {
  const client = getGeminiClient();

  if (!client) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const normalizedSymptoms = Array.isArray(symptoms)
    ? symptoms.map((item) => String(item || '').trim()).filter(Boolean)
    : String(symptoms || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  const normalizedSessionSymptoms = Array.isArray(sessionSymptoms)
    ? sessionSymptoms.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  const prompt = `
You are helping with an AI symptom checker for a healthcare app.
You must provide preliminary symptom guidance only.
Do not present your output as a diagnosis, final conclusion, or confirmed condition.
Always encourage professional medical evaluation when appropriate.

Analyze these symptoms:
- Current symptoms: ${normalizedSymptoms.join(', ') || 'None provided'}
- Recent session symptoms: ${normalizedSessionSymptoms.join(', ') || 'None provided'}

Return strict JSON only with this shape:
{
  "detectedSymptoms": ["symptom"],
  "possibleConditions": [
    {
      "name": "Condition name",
      "confidencePercent": 0,
      "reason": "Short explanation"
    }
  ],
  "summary": "A short paragraph that clearly says this is preliminary symptom guidance only and not a final diagnosis.",
  "selfCare": ["tip"],
  "whenToSeekCare": ["warning sign"],
  "urgency": "self_care" | "routine" | "soon" | "urgent"
}

Rules:
- confidencePercent must be between 0 and 100.
- Keep possibleConditions to a maximum of 5.
- Be cautious and medically conservative.
- If symptoms are unclear, say that clearly.
- Mention that a qualified clinician should confirm any condition.
`.trim();

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const parsed = extractJsonObject(response.text);
  const detectedSymptoms = normalizeDetectedSymptoms(parsed.detectedSymptoms);
  const possibleConditions = normalizePossibleConditions(parsed.possibleConditions);
  const consultationAdvice = buildConsultationAdvice(parsed.urgency, parsed.whenToSeekCare);
  const topConfidence = possibleConditions.length
    ? possibleConditions[0].confidencePercent / 100
    : 0;

  return {
    success: true,
    data: {
      symptoms: normalizedSymptoms,
      detectedSymptoms,
      possibleConditions,
      confidence: Number(topConfidence.toFixed(4)),
      recommendation: buildRecommendation(parsed),
      guidanceType: 'preliminary_symptom_guidance',
      disclaimer: PRELIMINARY_GUIDANCE_NOTICE,
      consultationAdvice,
      selfCare: Array.isArray(parsed.selfCare)
        ? parsed.selfCare.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
      whenToSeekCare: Array.isArray(parsed.whenToSeekCare)
        ? parsed.whenToSeekCare.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
      source: 'gemini',
    },
  };
}

module.exports = {
  PRELIMINARY_GUIDANCE_NOTICE,
  generateGeminiSymptomGuidance,
};
