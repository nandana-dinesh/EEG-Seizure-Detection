import os
import joblib


# ============================================================
# MODEL DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )
    )
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models"
)


# ============================================================
# LOAD FINAL 5-SECOND SVM MODEL
# ============================================================

model = joblib.load(
    os.path.join(
        MODEL_DIR,
        "svm_seizure_model_5sec.pkl"
    )
)


# ============================================================
# LOAD SCALER
# ============================================================

scaler = joblib.load(
    os.path.join(
        MODEL_DIR,
        "scaler_5sec.pkl"
    )
)


# ============================================================
# LOAD SELECTED FEATURE COLUMNS
# ============================================================

feature_columns = joblib.load(
    os.path.join(
        MODEL_DIR,
        "feature_columns_5sec.pkl"
    )
)


# ============================================================
# LOAD TRAINING MEDIANS
# ============================================================

training_medians = joblib.load(
    os.path.join(
        MODEL_DIR,
        "training_medians_5sec.pkl"
    )
)


# ============================================================
# VERIFICATION
# ============================================================

print("=" * 60)
print("FINAL 5-SECOND SVM MODEL LOADED")
print("=" * 60)

print("Model file:")
print("svm_seizure_model_5sec.pkl")

print("Scaler file:")
print("scaler_5sec.pkl")

print("Feature columns file:")
print("feature_columns_5sec.pkl")

print("Training medians file:")
print("training_medians_5sec.pkl")

print(
    "Number of selected features:",
    len(feature_columns)
)

print(
    "Training medians loaded:",
    len(training_medians)
)

print("=" * 60)