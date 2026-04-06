"""
Model Training Script
Trains a Decision Tree classifier and saves the model artifacts.
Run this script once to generate model files.
"""

import pandas as pd
import numpy as np
from sklearn import preprocessing
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
import joblib
from pathlib import Path
import sys


def load_dataset(csv_path):
    data = pd.read_csv(csv_path)
    data.columns = [str(col).strip() for col in data.columns]

    prognosis = data['prognosis'].astype(str).str.strip()
    feature_frame = data.drop(columns=['prognosis'])

    # The original dataset contains duplicate feature names like "fluid_overload".
    # Collapse duplicates so the exported feature list is stable for inference.
    feature_frame = feature_frame.T.groupby(level=0).max().T

    return feature_frame, prognosis


def train_and_save_model(training_csv_path, testing_csv_path=None, output_dir='models'):
    """
    Train the Decision Tree model and save artifacts
    """
    try:
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        print(f"Loading training data from {training_csv_path}...")
        x_value, y_value = load_dataset(training_csv_path)
        cols = x_value.columns

        print(f"Training features: {len(cols)} symptoms")
        print(f"Number of training samples: {len(x_value)}")
        print(f"Unique diseases: {y_value.nunique()}")
        print(f"Disease distribution:\n{y_value.value_counts().head(10)}")

        feature_names = list(cols)
        joblib.dump(feature_names, f'{output_dir}/feature_names.pkl')
        print(f"\nSaved feature names ({len(feature_names)} features)")

        label_encoder = preprocessing.LabelEncoder()
        label_encoder.fit(y_value)
        y_encoded = label_encoder.transform(y_value)

        joblib.dump(label_encoder, f'{output_dir}/label_encoder.pkl')
        print(f"Saved label encoder with {label_encoder.classes_.shape[0]} disease classes")

        reduced_data = pd.concat([x_value, y_value.rename('prognosis')], axis=1).groupby('prognosis').max()
        joblib.dump(reduced_data, f'{output_dir}/reduced_symptoms.pkl')
        print("Saved reduced symptom map for disease explanations")

        print("\nTraining Decision Tree Classifier...")
        classifier = DecisionTreeClassifier(random_state=42)
        class_counts = pd.Series(y_encoded).value_counts()

        if class_counts.min() >= 2 and len(x_value) > len(class_counts):
            x_train, x_test, y_train, y_test = train_test_split(
                x_value, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
            )
            classifier.fit(x_train, y_train)

            train_score = classifier.score(x_train, y_train)
            test_score = classifier.score(x_test, y_test)

            print(f"Training Accuracy: {train_score:.4f}")
            print(f"Testing Accuracy: {test_score:.4f}")
        else:
            # Some copies of the public disease dataset have only one row per disease.
            # In that case we train on the full matrix and skip an internal split.
            classifier.fit(x_value, y_encoded)
            full_score = classifier.score(x_value, y_encoded)
            print(f"Training Accuracy: {full_score:.4f}")
            print("Testing Accuracy: skipped (dataset has fewer than 2 samples per class)")

        if testing_csv_path and Path(testing_csv_path).exists():
            print(f"Loading testing data from {testing_csv_path}...")
            x_eval, y_eval = load_dataset(testing_csv_path)
            y_eval_encoded = label_encoder.transform(y_eval)
            eval_score = classifier.score(x_eval, y_eval_encoded)
            print(f"External Testing Accuracy: {eval_score:.4f}")

        feature_importance = classifier.feature_importances_
        top_features_idx = np.argsort(feature_importance)[-10:][::-1]
        print("\nTop 10 most important features:")
        for idx in top_features_idx:
            print(f"  - {feature_names[idx]}: {feature_importance[idx]:.4f}")

        joblib.dump(classifier, f'{output_dir}/disease_classifier.pkl')
        print("\nSaved trained classifier model")
        print(f"\nAll model files saved to '{output_dir}/' directory")
        print("\nModel is ready for use in symptom_analyzer.py")

        return True

    except FileNotFoundError:
        print(f"Error: Training file not found at {training_csv_path}")
        return False
    except Exception as e:
        print(f"Error during training: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    training_file = Path(__file__).parent / 'training_data' / 'Training.csv'
    testing_file = Path(__file__).parent / 'training_data' / 'Testing.csv'

    if not training_file.exists():
        training_file = Path(__file__).parent.parent.parent.parent / 'model' / 'Training.csv'
        testing_file = Path(__file__).parent.parent.parent.parent / 'model' / 'Testing.csv'

    if not training_file.exists():
        print("Error: Training.csv not found")
        print("Checked paths:")
        print(f"  - {Path(__file__).parent / 'training_data' / 'Training.csv'}")
        print(f"  - {Path(__file__).parent.parent.parent.parent / 'model' / 'Training.csv'}")
        sys.exit(1)

    print(f"Loading training data from: {training_file}")
    success = train_and_save_model(
        str(training_file),
        testing_csv_path=str(testing_file) if testing_file.exists() else None,
        output_dir='models'
    )
    sys.exit(0 if success else 1)
