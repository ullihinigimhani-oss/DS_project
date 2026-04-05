"""
Model Training Script
Trains a Random Forest classifier and saves the model artifacts.
Run this script once to generate model files.
"""

import pandas as pd
import numpy as np
from sklearn import preprocessing
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
import joblib
from pathlib import Path
import sys


def train_and_save_model(training_csv_path, output_dir='models'):
    """
    Train the Random Forest model and save artifacts
    """
    try:
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        print(f"Loading training data from {training_csv_path}...")
        training = pd.read_csv(training_csv_path)

        cols = training.columns[:-1]
        x_value = training[cols]
        y_value = training['prognosis']

        print(f"Training features: {len(cols)} symptoms")
        print(f"Number of training samples: {len(training)}")
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

        x_train, x_test, y_train, y_test = train_test_split(
            x_value, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )

        print("\nTraining Random Forest Classifier...")
        classifier = RandomForestClassifier(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'
        )
        classifier.fit(x_train, y_train)

        train_score = classifier.score(x_train, y_train)
        test_score = classifier.score(x_test, y_test)
        cv_scores = cross_val_score(classifier, x_train, y_train, cv=5)

        print(f"Training Accuracy: {train_score:.4f}")
        print(f"Testing Accuracy: {test_score:.4f}")
        print(f"Cross-Validation Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

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

    if not training_file.exists():
      training_file = Path(__file__).parent.parent.parent.parent / 'model' / 'Training.csv'

    if not training_file.exists():
        print("Error: Training.csv not found")
        print("Checked paths:")
        print(f"  - {Path(__file__).parent / 'training_data' / 'Training.csv'}")
        print(f"  - {Path(__file__).parent.parent.parent.parent / 'model' / 'Training.csv'}")
        sys.exit(1)

    print(f"Loading training data from: {training_file}")
    success = train_and_save_model(str(training_file), output_dir='models')
    sys.exit(0 if success else 1)
