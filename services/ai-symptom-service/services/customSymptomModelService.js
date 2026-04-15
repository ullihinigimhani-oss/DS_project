const fs = require('fs');
const path = require('path');
const { PRELIMINARY_GUIDANCE_NOTICE } = require('./geminiSymptomService');

const TRAINING_DATA_PATH = path.join(
  __dirname,
  '..',
  'ml-integration',
  'training_data',
  'Training.csv'
);
const CONSULT_DATA_PATH = path.join(
  __dirname,
  '..',
  'ml-integration',
  'training_data',
  'doc_consult.csv'
);

const PRIMARY_CONFIDENCE_THRESHOLD = Number(
  process.env.PRIMARY_MODEL_CONFIDENCE_THRESHOLD || 0.62
);
const PRIMARY_CONFIDENCE_GAP = Number(process.env.PRIMARY_MODEL_CONFIDENCE_GAP || 0.08);
const PRIMARY_MIN_DETECTED_SYMPTOMS = Number(
  process.env.PRIMARY_MODEL_MIN_DETECTED_SYMPTOMS || 2
);

const MANUAL_SYMPTOM_ALIASES = {
  high_fever: ['fever', 'high fever', 'temperature'],
  mild_fever: ['low fever', 'mild fever', 'slight fever'],
  cough: ['cough', 'coughing'],
  fatigue: ['fatigue', 'tired', 'tiredness', 'exhausted'],
  headache: ['headache', 'head pain'],
  throat_irritation: ['sore throat', 'throat pain', 'throat irritation'],
  runny_nose: ['runny nose', 'nasal discharge'],
  congestion: ['stuffy nose', 'blocked nose', 'nasal congestion', 'congestion'],
  breathlessness: ['shortness of breath', 'breathing difficulty', 'breathlessness'],
  chest_pain: ['chest pain', 'chest discomfort'],
  nausea: ['nausea', 'nauseated', 'feeling sick'],
  vomiting: ['vomiting', 'throwing up', 'vomit'],
  diarrhoea: ['diarrhea', 'diarrhoea', 'loose stool', 'loose stools'],
  abdominal_pain: ['abdominal pain', 'stomach pain', 'belly pain', 'abdomen pain'],
  stomach_pain: ['stomach ache'],
  dizziness: ['dizzy', 'dizziness', 'lightheaded'],
  muscle_pain: ['body ache', 'body pain', 'muscle ache', 'muscle pain'],
  joint_pain: ['joint pain', 'joint ache'],
  phlegm: ['phlegm', 'mucus'],
  sweating: ['sweating', 'sweaty'],
  chills: ['chills', 'chilly'],
  shivering: ['shivering', 'shiver'],
  loss_of_appetite: ['loss of appetite', 'no appetite'],
  skin_rash: ['skin rash', 'rash'],
  itching: ['itching', 'itch'],
  yellowish_skin: ['yellow skin', 'yellowish skin'],
  yellowing_of_eyes: ['yellow eyes', 'yellowing of eyes'],
  dark_urine: ['dark urine'],
  constipation: ['constipation', 'constipated'],
  anxiety: ['anxiety', 'anxious'],
  palpitations: ['palpitations', 'rapid heartbeat', 'heart racing'],
  loss_of_smell: ['loss of smell', 'cannot smell'],
};

const SPECIALIST_RULES = [
  { match: /fungal|allergy|psoriasis|impetigo|acne/i, specialist: 'Dermatologist' },
  { match: /gerd|ulcer|gastro|hepatitis|jaundice|cholestasis|hemorrhoids/i, specialist: 'Gastroenterologist' },
  { match: /diabetes|thyroid|hypoglycemia/i, specialist: 'Endocrinologist' },
  { match: /asthma|pneumonia|tuberculosis|cold/i, specialist: 'Pulmonologist' },
  { match: /hypertension|heart attack/i, specialist: 'Cardiologist' },
  { match: /migraine|paralysis|vertigo|brain/i, specialist: 'Neurologist' },
  { match: /spondylosis|arthritis|osteo/i, specialist: 'Orthopedic Specialist' },
  { match: /urinary tract infection/i, specialist: 'Urologist' },
  { match: /malaria|dengue|typhoid|aids|chicken pox/i, specialist: 'Infectious Disease Specialist' },
];

const SYMPTOM_SPECIALIST_RULES = [
  { symptoms: ['chest_pain', 'palpitations', 'fast_heart_rate'], specialist: 'Cardiologist' },
  { symptoms: ['breathlessness', 'cough', 'phlegm', 'blood_in_sputum'], specialist: 'Pulmonologist' },
  { symptoms: ['abdominal_pain', 'vomiting', 'diarrhoea', 'yellowish_skin', 'dark_urine'], specialist: 'Gastroenterologist' },
  { symptoms: ['skin_rash', 'itching', 'skin_peeling', 'blister'], specialist: 'Dermatologist' },
  { symptoms: ['headache', 'dizziness', 'loss_of_balance', 'slurred_speech'], specialist: 'Neurologist' },
];

const GENERIC_SYMPTOMS = new Set([
  'fatigue',
  'malaise',
  'headache',
  'dizziness',
  'sweating',
  'anxiety',
  'loss_of_appetite',
  'mild_fever',
]);

function normalizeWhitespace(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanSymptomPhrase(value) {
  return String(value || '')
    .replace(/^(i have|i am having|i'm having|having|my|with)\s+/i, '')
    .replace(/\.+$/g, '')
    .trim();
}

function toTitleCase(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildFeatureAliases(featureName) {
  const normalized = normalizeWhitespace(featureName);
  const aliases = new Set([normalized]);

  if (normalized.includes('pain')) {
    aliases.add(normalized.replace('pain', 'ache').trim());
  }

  if (normalized.includes('urine')) {
    aliases.add(normalized.replace('urine', 'urination').trim());
  }

  if (normalized.includes('throat irritation')) {
    aliases.add('sore throat');
  }

  return aliases;
}

function loadConsultScores() {
  if (!fs.existsSync(CONSULT_DATA_PATH)) {
    return new Map();
  }

  const lines = fs
    .readFileSync(CONSULT_DATA_PATH, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = lines.slice(1);
  const scores = new Map();

  for (const row of rows) {
    const [disease, risk] = row.split(',');
    if (disease && risk) {
      scores.set(disease.trim(), Number(risk));
    }
  }

  return scores;
}

function loadDiseaseModel() {
  if (!fs.existsSync(TRAINING_DATA_PATH)) {
    throw new Error(`Training data not found at ${TRAINING_DATA_PATH}`);
  }

  const lines = fs
    .readFileSync(TRAINING_DATA_PATH, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const headers = lines[0].split(',').map((value) => value.trim());
  const prognosisIndex = headers.length - 1;
  const featureNames = headers.slice(0, prognosisIndex);
  const diseases = new Map();

  for (const line of lines.slice(1)) {
    const values = line.split(',');
    if (values.length < headers.length) {
      continue;
    }

    const diseaseName = values[prognosisIndex].trim();
    if (!diseaseName) {
      continue;
    }

    const existing = diseases.get(diseaseName) || new Set();

    featureNames.forEach((featureName, index) => {
      if (String(values[index] || '').trim() === '1') {
        existing.add(featureName.trim());
      }
    });

    diseases.set(diseaseName, existing);
  }

  const featureAliasMap = new Map();

  for (const featureName of featureNames) {
    const aliases = new Set(buildFeatureAliases(featureName));
    for (const manualAlias of MANUAL_SYMPTOM_ALIASES[featureName] || []) {
      aliases.add(normalizeWhitespace(manualAlias));
    }
    featureAliasMap.set(featureName, aliases);
  }

  return {
    diseases,
    featureAliasMap,
    consultScores: loadConsultScores(),
  };
}

const diseaseModel = loadDiseaseModel();

function normalizeSymptomsInput(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => cleanSymptomPhrase(item))
      .filter(Boolean);
  }

  return String(input || '')
    .split(/[,\n]/)
    .map((item) => cleanSymptomPhrase(item))
    .filter(Boolean);
}

function extractDetectedSymptoms(inputs) {
  const rawPhrases = normalizeSymptomsInput(inputs);
  const rawText = rawPhrases.join(' ').toLowerCase();
  const detected = new Set();

  for (const [featureName, aliases] of diseaseModel.featureAliasMap.entries()) {
    for (const alias of aliases) {
      if (!alias) {
        continue;
      }

      if (rawText.includes(alias)) {
        detected.add(featureName);
        break;
      }
    }
  }

  return Array.from(detected);
}

function getRecommendedSpecialist(conditionName) {
  const disease = String(conditionName || '');
  const matchedRule = SPECIALIST_RULES.find((rule) => rule.match.test(disease));
  return matchedRule ? matchedRule.specialist : 'General Physician';
}

function getSpecialistFromSymptoms(detectedSymptoms) {
  const detected = new Set(detectedSymptoms);
  const matchedRule = SYMPTOM_SPECIALIST_RULES.find((rule) =>
    rule.symptoms.some((symptom) => detected.has(symptom))
  );

  return matchedRule ? matchedRule.specialist : null;
}

function getUrgencyLevel(risk) {
  if (risk >= 85) return 'urgent';
  if (risk >= 60) return 'soon';
  if (risk >= 35) return 'routine';
  return 'self_care';
}

function buildConsultationAdvice(risk, specialist) {
  const level = getUrgencyLevel(risk);
  const messages = {
    urgent: `Please seek urgent medical evaluation. A ${specialist} or emergency clinician should review these symptoms quickly.`,
    soon: `Please arrange a prompt consultation with a ${specialist}.`,
    routine: `Please book a routine review with a ${specialist} if symptoms continue or worsen.`,
    self_care: `Home monitoring may be reasonable for now, but consult a ${specialist} if symptoms do not improve.`,
  };

  return {
    level,
    risk,
    message: messages[level],
    warningSigns: [],
  };
}

function buildSelfCareTips(symptoms) {
  const detected = new Set(symptoms);
  const tips = new Set([
    'Monitor your symptoms and keep a brief record of any changes.',
    'Stay hydrated and rest while symptoms are being monitored.',
  ]);

  if (detected.has('high_fever') || detected.has('mild_fever')) {
    tips.add('Drink fluids regularly and monitor your temperature.');
  }

  if (detected.has('cough') || detected.has('throat_irritation')) {
    tips.add('Warm fluids and voice rest may help mild throat and cough symptoms.');
  }

  if (detected.has('diarrhoea') || detected.has('vomiting')) {
    tips.add('Use oral rehydration and seek care quickly if you cannot keep fluids down.');
  }

  if (detected.has('breathlessness') || detected.has('chest_pain')) {
    tips.add('Do not ignore breathing difficulty or chest pain; be ready to seek urgent care.');
  }

  return Array.from(tips);
}

function buildWhenToSeekCare(symptoms) {
  const detected = new Set(symptoms);
  const warnings = new Set([
    'Seek medical care if symptoms become significantly worse or last longer than expected.',
  ]);

  if (detected.has('high_fever')) {
    warnings.add('Seek care if fever stays high, keeps returning, or is associated with weakness or confusion.');
  }

  if (detected.has('breathlessness') || detected.has('chest_pain')) {
    warnings.add('Get urgent care immediately for chest pain, severe breathlessness, or blue lips.');
  }

  if (detected.has('vomiting') || detected.has('diarrhoea')) {
    warnings.add('Seek care if there are signs of dehydration, severe abdominal pain, or blood in vomit or stool.');
  }

  return Array.from(warnings);
}

function scoreDisease(detectedSymptoms, diseaseSymptoms) {
  const detectedSet = new Set(detectedSymptoms);
  const diseaseSet = new Set(diseaseSymptoms);
  const overlap = detectedSymptoms.filter((symptom) => diseaseSet.has(symptom));

  if (!overlap.length) {
    return null;
  }

  const coverage = overlap.length / detectedSet.size;
  const specificity = overlap.length / diseaseSet.size;
  const baseScore = coverage * 0.7 + specificity * 0.2;
  const symptomCountBoost = Math.min(1, detectedSymptoms.length / 4);
  const overlapBoost = Math.min(1, overlap.length / 3);
  const genericPenalty =
    overlap.length === 1 && GENERIC_SYMPTOMS.has(overlap[0])
      ? 0.35
      : overlap.filter((symptom) => GENERIC_SYMPTOMS.has(symptom)).length /
          Math.max(overlap.length, 1) *
        0.1;
  const score = Math.max(
    0,
    Math.min(1, baseScore * 0.6 + symptomCountBoost * 0.25 + overlapBoost * 0.15 - genericPenalty)
  );

  return {
    overlap,
    score,
    coverage,
    specificity,
  };
}

function buildRecommendation(topCondition, specialist) {
  if (!topCondition) {
    return `${PRELIMINARY_GUIDANCE_NOTICE} Your symptoms do not strongly match a single condition in the primary model, so a clinician should review them directly.`;
  }

  const confidenceText = `${Math.round(topCondition.confidence * 100)}%`;
  return `${PRELIMINARY_GUIDANCE_NOTICE} Possible condition: ${topCondition.name}. This primary model match has an estimated confidence of ${confidenceText}. The recommended next step is a review with a ${specialist}.`;
}

function resolveRecommendedSpecialist(topCondition, detectedSymptoms) {
  const symptomBasedSpecialist = getSpecialistFromSymptoms(detectedSymptoms);

  if (detectedSymptoms.length < 2) {
    return symptomBasedSpecialist || 'General Physician';
  }

  if (!topCondition) {
    return symptomBasedSpecialist || 'General Physician';
  }

  if (topCondition.confidence < PRIMARY_CONFIDENCE_THRESHOLD) {
    return symptomBasedSpecialist || 'General Physician';
  }

  return symptomBasedSpecialist || topCondition.specialist || 'General Physician';
}

function shouldUsePrimaryModel(result) {
  if (!result?.possibleConditions?.length) {
    return false;
  }

  const top = result.possibleConditions[0];
  const second = result.possibleConditions[1];
  const gap = second ? top.confidence - second.confidence : top.confidence;

  return (
    result.detectedSymptoms.length >= PRIMARY_MIN_DETECTED_SYMPTOMS &&
    top.confidence >= PRIMARY_CONFIDENCE_THRESHOLD &&
    gap >= PRIMARY_CONFIDENCE_GAP
  );
}

function analyzeWithCustomModel({ symptoms, sessionSymptoms = [] }) {
  const combinedInputs = [...normalizeSymptomsInput(symptoms), ...normalizeSymptomsInput(sessionSymptoms)];
  const detectedSymptoms = extractDetectedSymptoms(combinedInputs);

  if (!detectedSymptoms.length) {
    return {
      success: true,
      data: {
        symptoms: combinedInputs,
        detectedSymptoms: [],
        possibleConditions: [],
        confidence: 0,
        recommendation: `${PRELIMINARY_GUIDANCE_NOTICE} The primary symptom model could not confidently detect recognizable symptoms from this input.`,
        guidanceType: 'preliminary_symptom_guidance',
        disclaimer: PRELIMINARY_GUIDANCE_NOTICE,
        consultationAdvice: buildConsultationAdvice(20, 'General Physician'),
        selfCare: buildSelfCareTips([]),
        whenToSeekCare: buildWhenToSeekCare([]),
        source: 'custom-model',
        recommendedSpecialist: 'General Physician',
        severity: 'low',
        primaryModelAccepted: false,
      },
    };
  }

  const rankedConditions = Array.from(diseaseModel.diseases.entries())
    .map(([diseaseName, diseaseSymptoms]) => {
      const scoring = scoreDisease(detectedSymptoms, Array.from(diseaseSymptoms));
      if (!scoring) {
        return null;
      }

      const risk = diseaseModel.consultScores.get(diseaseName) || 35;
      const specialist = getRecommendedSpecialist(diseaseName);

      return {
        name: diseaseName,
        confidence: Number(scoring.score.toFixed(4)),
        confidencePercent: Number((scoring.score * 100).toFixed(1)),
        reason: `Matched ${scoring.overlap.length} of ${detectedSymptoms.length} detected symptoms.`,
        matchedSymptoms: scoring.overlap.map((symptom) => toTitleCase(normalizeWhitespace(symptom))),
        risk,
        specialist,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);

  const topCondition = rankedConditions[0] || null;
  const specialist = resolveRecommendedSpecialist(topCondition, detectedSymptoms);
  const risk = topCondition?.risk || 20;
  const primaryResult = {
    success: true,
    data: {
      symptoms: combinedInputs,
      detectedSymptoms: detectedSymptoms.map((symptom) => toTitleCase(normalizeWhitespace(symptom))),
      possibleConditions: rankedConditions,
      confidence: topCondition?.confidence || 0,
      recommendation: buildRecommendation(topCondition, specialist),
      guidanceType: 'preliminary_symptom_guidance',
      disclaimer: PRELIMINARY_GUIDANCE_NOTICE,
      consultationAdvice: buildConsultationAdvice(risk, specialist),
      selfCare: buildSelfCareTips(detectedSymptoms),
      whenToSeekCare: buildWhenToSeekCare(detectedSymptoms),
      source: 'custom-model',
      recommendedSpecialist: specialist,
      severity: getUrgencyLevel(risk),
      primaryModelAccepted: false,
    },
  };

  primaryResult.data.primaryModelAccepted = shouldUsePrimaryModel(primaryResult.data);
  return primaryResult;
}

module.exports = {
  analyzeWithCustomModel,
  shouldUsePrimaryModel,
};
