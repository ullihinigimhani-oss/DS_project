"""
Python AI Symptom Analyzer Service
Exposes the Decision Tree model via REST API
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST, Counter, Histogram, REGISTRY
import time
import joblib
import numpy as np
import pandas as pd
import os
import csv
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['endpoint'])


@app.before_request
def before_request():
    from flask import g
    g.start_time = time.time()


@app.after_request
def after_request(response):
    from flask import g, request
    latency = time.time() - g.start_time
    REQUEST_COUNT.labels(method=request.method, endpoint=request.path, status=response.status_code).inc()
    REQUEST_LATENCY.labels(endpoint=request.path).observe(latency)
    return response


@app.route('/metrics')
def metrics():
    return Response(generate_latest(REGISTRY), mimetype=CONTENT_TYPE_LATEST)


# Load the model and supporting data
try:
    model_dir = Path(__file__).parent.absolute()

    model_path = model_dir / 'models' / 'disease_classifier.pkl'
    if not model_path.exists():
        print(f"Warning: Model not found at {model_path}")
        clf = None
    else:
        clf = joblib.load(model_path)

    encoder_path = model_dir / 'models' / 'label_encoder.pkl'
    if not encoder_path.exists():
        print(f"Warning: Encoder not found at {encoder_path}")
        le = None
    else:
        le = joblib.load(encoder_path)

    features_path = model_dir / 'models' / 'feature_names.pkl'
    if not features_path.exists():
        print(f"Warning: Features not found at {features_path}")
        feature_names = []
    else:
        feature_names = joblib.load(features_path)

    reduced_path = model_dir / 'models' / 'reduced_symptoms.pkl'
    if not reduced_path.exists():
        print(f"Warning: Reduced symptom map not found at {reduced_path}")
        reduced_symptoms = None
    else:
        reduced_symptoms = joblib.load(reduced_path)

    consult_path = model_dir / 'training_data' / 'doc_consult.csv'
    if consult_path.exists():
        with consult_path.open(newline='', encoding='utf-8') as handle:
            consult_scores = {
                row['disease'].strip(): int(row['risk'])
                for row in csv.DictReader(handle)
            }
    else:
        print(f"Warning: Doctor consult data not found at {consult_path}")
        consult_scores = {}

    print(f"Model loaded successfully from {model_dir}")
except Exception as e:
    print(f"Error loading model: {e}")
    clf = None
    le = None
    feature_names = []
    reduced_symptoms = None
    consult_scores = {}


def extract_symptoms_from_text(text):
    """
    Extract symptoms from user input text using comprehensive dataset mapping.
    Maps user input to ALL 132 symptom features from the training data.
    """
    text = text.lower()

    symptom_mapping = {
        'itching': ['itching', 'itch'],
        'skin_rash': ['rash', 'skin rash', 'skin irritation'],
        'nodal_skin_eruptions': ['nodal eruptions', 'skin eruptions'],
        'continuous_sneezing': ['sneezing', 'continuous sneeze'],
        'shivering': ['shivering', 'shiver'],
        'chills': ['chills', 'chilly'],
        'joint_pain': ['joint pain', 'joint ache'],
        'stomach_pain': ['stomach pain', 'stomach ache'],
        'acidity': ['acidity', 'acid reflux', 'heartburn'],
        'ulcers_on_tongue': ['ulcer', 'tongue ulcer'],
        'muscle_wasting': ['muscle wasting', 'muscle loss'],
        'vomiting': ['vomiting', 'throwing up', 'vomit'],
        'burning_micturition': ['burning urination', 'painful urination'],
        'spotting_ urination': ['spotting', 'blood in urine'],
        'fatigue': ['fatigue', 'tired', 'tiredness'],
        'weight_gain': ['weight gain', 'gaining weight'],
        'anxiety': ['anxiety', 'anxious'],
        'cold_hands_and_feets': ['cold hands', 'cold feet'],
        'mood_swings': ['mood swings', 'mood changes'],
        'weight_loss': ['weight loss', 'losing weight'],
        'restlessness': ['restlessness', 'restless'],
        'lethargy': ['lethargy', 'lethargic'],
        'patches_in_throat': ['patches in throat', 'throat patches'],
        'irregular_sugar_level': ['irregular sugar', 'blood sugar'],
        'cough': ['cough', 'coughing'],
        'high_fever': ['high fever', 'fever', 'elevated fever'],
        'sunken_eyes': ['sunken eyes'],
        'breathlessness': ['breathlessness', 'shortness of breath', 'breathing difficulty'],
        'sweating': ['sweating', 'excessive sweating'],
        'dehydration': ['dehydration', 'dehydrated'],
        'indigestion': ['indigestion', 'upset stomach'],
        'headache': ['headache', 'head pain'],
        'yellowish_skin': ['yellowish skin', 'yellow skin'],
        'dark_urine': ['dark urine', 'dark colored urine'],
        'nausea': ['nausea', 'feeling sick', 'nauseated'],
        'loss_of_appetite': ['loss of appetite', 'no appetite'],
        'pain_behind_the_eyes': ['pain behind eyes', 'eye pain'],
        'back_pain': ['back pain', 'back ache'],
        'constipation': ['constipation', 'constipated'],
        'abdominal_pain': ['abdominal pain', 'belly pain', 'abdomen pain'],
        'diarrhoea': ['diarrhea', 'diarrhoea', 'loose stools'],
        'mild_fever': ['mild fever', 'slight fever', 'low fever'],
        'yellow_urine': ['yellow urine'],
        'yellowing_of_eyes': ['yellowing of eyes', 'yellow eyes'],
        'acute_liver_failure': ['liver failure', 'acute liver'],
        'fluid_overload': ['fluid overload', 'swelling'],
        'swelling_of_stomach': ['swollen stomach', 'abdominal swelling'],
        'swelled_lymph_nodes': ['swollen lymph nodes', 'lymph nodes'],
        'malaise': ['malaise', 'general illness feeling'],
        'blurred_and_distorted_vision': ['blurred vision', 'vision distortion'],
        'phlegm': ['phlegm', 'mucus'],
        'throat_irritation': ['throat irritation', 'sore throat'],
        'redness_of_eyes': ['red eyes', 'eye redness'],
        'sinus_pressure': ['sinus pressure', 'sinus pain'],
        'runny_nose': ['runny nose', 'nasal discharge'],
        'congestion': ['congestion', 'stuffy nose', 'nasal congestion'],
        'chest_pain': ['chest pain', 'chest discomfort'],
        'weakness_in_limbs': ['weakness in limbs', 'limb weakness'],
        'fast_heart_rate': ['fast heart rate', 'rapid heartbeat', 'tachycardia'],
        'pain_during_bowel_movements': ['pain during bowel', 'defecation pain'],
        'pain_in_anal_region': ['anal pain', 'rectal pain'],
        'bloody_stool': ['bloody stool', 'blood in stool'],
        'irritation_in_anus': ['anal irritation', 'rectal irritation'],
        'neck_pain': ['neck pain', 'neck stiffness'],
        'dizziness': ['dizziness', 'dizzy', 'vertigo'],
        'cramps': ['cramps', 'cramping'],
        'bruising': ['bruising', 'bruise', 'bruised'],
        'obesity': ['obesity', 'overweight'],
        'swollen_legs': ['swollen legs', 'leg swelling'],
        'swollen_blood_vessels': ['swollen blood vessels', 'prominent veins'],
        'puffy_face_and_eyes': ['puffy face', 'swollen face', 'puffy eyes'],
        'enlarged_thyroid': ['enlarged thyroid', 'thyroid enlargement'],
        'brittle_nails': ['brittle nails'],
        'swollen_extremeties': ['swollen extremities', 'swollen hands', 'swollen feet'],
        'excessive_hunger': ['excessive hunger', 'always hungry'],
        'extra_marital_contacts': ['extramarital contacts'],
        'drying_and_tingling_lips': ['tingling lips', 'dry lips'],
        'slurred_speech': ['slurred speech'],
        'knee_pain': ['knee pain'],
        'hip_joint_pain': ['hip pain', 'hip joint pain'],
        'muscle_weakness': ['muscle weakness', 'weak muscles'],
        'stiff_neck': ['stiff neck', 'neck stiffness'],
        'swelling_joints': ['swollen joints', 'joint swelling'],
        'movement_stiffness': ['stiffness', 'movement stiffness'],
        'spinning_movements': ['spinning', 'dizziness'],
        'loss_of_balance': ['balance loss', 'loss of balance'],
        'unsteadiness': ['unsteadiness', 'unsteady'],
        'weakness_of_one_body_side': ['weakness on one side', 'one sided weakness'],
        'loss_of_smell': ['loss of smell', 'cannot smell'],
        'bladder_discomfort': ['bladder discomfort'],
        'foul_smell_of urine': ['foul smelling urine', 'urine smells'],
        'continuous_feel_of_urine': ['urge to urinate', 'continuous urge'],
        'passage_of_gases': ['gas', 'passage of gases'],
        'internal_itching': ['internal itching', 'itching inside'],
        'toxic_look_(typhos)': ['toxic look', 'typhos'],
        'depression': ['depression', 'depressed'],
        'irritability': ['irritability', 'irritable'],
        'muscle_pain': ['muscle pain', 'muscle ache'],
        'altered_sensorium': ['altered sensorium', 'confusion'],
        'red_spots_over_body': ['red spots', 'spots on skin'],
        'belly_pain': ['belly pain', 'abdominal pain'],
        'abnormal_menstruation': ['abnormal menstruation', 'irregular period'],
        'dischromic _patches': ['discolored patches', 'skin patches'],
        'watering_from_eyes': ['watering eyes', 'eye discharge'],
        'increased_appetite': ['increased appetite'],
        'polyuria': ['polyuria', 'excessive urination'],
        'family_history': ['family history', 'hereditary'],
        'mucoid_sputum': ['mucoid sputum', 'phlegmy cough'],
        'rusty_sputum': ['rusty sputum'],
        'lack_of_concentration': ['lack of concentration', 'cannot concentrate'],
        'visual_disturbances': ['visual disturbances', 'vision problems'],
        'receiving_blood_transfusion': ['blood transfusion'],
        'receiving_unsterile_injections': ['unsterile injections'],
        'coma': ['coma', 'unconscious'],
        'stomach_bleeding': ['stomach bleeding', 'internal bleeding'],
        'distention_of_abdomen': ['abdominal distention', 'bloated abdomen'],
        'history_of_alcohol_consumption': ['alcohol consumption', 'alcohol use'],
        'blood_in_sputum': ['blood in sputum', 'hemoptysis'],
        'prominent_veins_on_calf': ['prominent veins', 'swollen veins'],
        'palpitations': ['palpitations', 'heart palpitations'],
        'painful_walking': ['painful walking', 'pain when walking'],
        'pus_filled_pimples': ['pus filled pimples', 'pustules'],
        'blackheads': ['blackheads'],
        'scurring': ['scurring', 'scaling'],
        'skin_peeling': ['skin peeling', 'peeling skin'],
        'silver_like_dusting': ['silver dusting'],
        'small_dents_in_nails': ['dented nails', 'nail dents'],
        'inflammatory_nails': ['inflamed nails'],
        'blister': ['blister', 'blistering'],
        'red_sore_around_nose': ['sore around nose', 'red nose'],
        'yellow_crust_ooze': ['yellow crust', 'oozing'],
    }

    detected = []
    for feature, keywords in symptom_mapping.items():
        for keyword in keywords:
            if keyword in text:
                detected.append(feature)
                break

    return detected


def predict_disease(x_value, top_n=5):
    """Predict top N diseases from symptoms array with confidence scores"""
    if clf is None or le is None:
        return [], []

    try:
        probabilities = clf.predict_proba(x_value)[0]
        top_indices = np.argsort(probabilities)[::-1][:top_n]

        diseases = []
        confidences = []

        for idx in top_indices:
            disease = le.inverse_transform([idx])[0]
            confidence = float(probabilities[idx])
            diseases.append(disease)
            confidences.append(confidence)

        return diseases, confidences
    except Exception as e:
        print(f"Error during prediction: {e}")
        return [], []


def get_related_symptoms(disease_name):
    if reduced_symptoms is None or disease_name not in reduced_symptoms.index:
        return []

    active = reduced_symptoms.loc[disease_name]
    return [symptom for symptom, value in active.items() if int(value) == 1]


def build_consultation(disease_name):
    risk = consult_scores.get(disease_name)
    if risk is None:
        return None

    return {
        'risk': risk,
        'consultDoctorImmediately': risk > 50,
        'message': (
            'You should consult a doctor as soon as possible'
            if risk > 50
            else 'You may consult a doctor'
        ),
    }


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'AI Symptom Analyzer Service is running',
        'model_loaded': clf is not None,
        'encoder_loaded': le is not None,
        'features_count': len(feature_names)
    }), 200


@app.route('/api/symptoms/analyze', methods=['POST'])
def analyze_symptoms():
    """
    Analyze symptoms and predict disease
    Expected input: { "symptoms": "user description" }
    """
    try:
        data = request.get_json()

        if not data or 'symptoms' not in data:
            return jsonify({
                'success': False,
                'message': 'Symptoms text is required'
            }), 400

        user_input = data['symptoms']
        detected_symptoms = extract_symptoms_from_text(user_input)

        if not detected_symptoms:
            return jsonify({
                'success': True,
                'data': {
                    'symptoms': user_input,
                    'detectedSymptoms': [],
                    'possibleConditions': [],
                    'confidence': 0,
                    'recommendation': 'No specific symptoms detected. Please describe your symptoms more clearly (e.g., "fever", "cough", "headache").',
                }
            }), 200

        if feature_names:
            feature_vector = {feature: 0 for feature in feature_names}
            for symptom in detected_symptoms:
                if symptom in feature_vector:
                    feature_vector[symptom] = 1
            x_value = pd.DataFrame([feature_vector], columns=feature_names)
        else:
            x_value = np.zeros((1, 20))
            for i, symptom in enumerate(detected_symptoms[:20]):
                x_value[0][i] = 1

        diseases, confidences = predict_disease(x_value, top_n=5)

        if diseases:
            conditions = [
                {
                    "name": disease,
                    "confidence": confidence,
                    "confidencePercent": round(confidence * 100, 1)
                }
                for disease, confidence in zip(diseases, confidences)
            ]

            top_disease = diseases[0]
            top_confidence_percent = round(confidences[0] * 100, 1)
            related_symptoms = get_related_symptoms(top_disease)
            consultation = build_consultation(top_disease)

            if consultation and consultation['consultDoctorImmediately']:
                recommendation = (
                    f"Based on your symptoms, the most likely condition is **{top_disease}** "
                    f"(Confidence: {top_confidence_percent}%). {consultation['message']}."
                )
            elif confidences[0] > 0.5:
                recommendation = f"Based on your symptoms, the most likely condition is **{top_disease}** (Confidence: {top_confidence_percent}%). However, consult a healthcare professional for proper diagnosis."
            elif confidences[0] > 0.3:
                recommendation = f"Your symptoms suggest **{top_disease}** (Confidence: {top_confidence_percent}%), but multiple conditions are possible. Please consult a healthcare professional."
            else:
                recommendation = f"Multiple conditions could match your symptoms. The analysis suggests **{top_disease}** (Confidence: {top_confidence_percent}%). Consult a healthcare professional for accurate diagnosis."
        else:
            recommendation = "Could not determine diagnosis from symptoms. Please consult a doctor."
            conditions = []
            related_symptoms = []
            consultation = None

        return jsonify({
            'success': True,
            'data': {
                'symptoms': user_input,
                'detectedSymptoms': detected_symptoms,
                'possibleConditions': conditions,
                'confidence': confidences[0] if confidences else 0,
                'recommendation': recommendation,
                'matchedDiseaseSymptoms': related_symptoms,
                'consultationAdvice': consultation,
            }
        }), 200

    except Exception as e:
        print(f"Error in analyze_symptoms: {e}")
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        }), 500


@app.route('/api/symptoms/features', methods=['GET'])
def get_features():
    """Get list of all symptom features the model understands"""
    return jsonify({
        'success': True,
        'features': feature_names,
        'count': len(feature_names),
        'consultationDiseases': len(consult_scores)
    }), 200


if __name__ == '__main__':
    port = os.environ.get('PYTHON_SERVICE_PORT', 5000)
    app.run(host='0.0.0.0', port=port, debug=True)
