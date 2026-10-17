import numpy as np
import pandas as pd

from app.services.ml_model import (
    model,
    scaler,
    feature_columns,
    training_medians
)

from app.services.eeg_processor import (
    extract_features_for_prediction
)


def predict_edf(edf_path):

    print("=" * 60)
    print("SVM PREDICTION - 5 SECOND MODEL")
    print("=" * 60)

    # --------------------------------------------------------
    # EXTRACT EEG FEATURES
    # --------------------------------------------------------

    features = extract_features_for_prediction(
        edf_path
    )

    print(
        "Extracted features:",
        features.shape
    )

    # --------------------------------------------------------
    # REMOVE METADATA COLUMNS
    # --------------------------------------------------------

    metadata_columns = [
        "segment",
        "start_time",
        "end_time"
    ]

    feature_data = features.drop(
        columns=[
            column
            for column in metadata_columns
            if column in features.columns
        ],
        errors="ignore"
    )

    # --------------------------------------------------------
    # MATCH TRAINED FEATURE COLUMNS
    # --------------------------------------------------------

    feature_data = feature_data.reindex(
        columns=feature_columns
    )

    print(
        "Selected model features:",
        feature_data.shape[1]
    )

    print(
        "Trained features:",
        len(feature_columns)
    )

    # --------------------------------------------------------
    # CHECK FEATURE NAMES
    # --------------------------------------------------------

    if list(feature_data.columns) != list(
        feature_columns
    ):

        raise ValueError(
            "Feature columns do not match "
            "trained features!"
        )

    print(
        "Feature names match: True"
    )

    # --------------------------------------------------------
    # HANDLE MISSING / INFINITE VALUES
    # USING TRAINING MEDIANS
    # --------------------------------------------------------

    feature_data = feature_data.replace(
        [np.inf, -np.inf],
        np.nan
    )

    missing_before = int(
        feature_data.isna().sum().sum()
    )

    if missing_before > 0:

        print(
            "Missing/non-finite values found:",
            missing_before
        )

        for column in feature_data.columns:

            if feature_data[column].isna().any():

                median_value = (
                    training_medians.get(
                        column,
                        0.0
                    )
                )

                feature_data[column] = (
                    feature_data[column]
                    .fillna(median_value)
                )

    missing_after = int(
        feature_data.isna().sum().sum()
    )

    if missing_after > 0:

        raise ValueError(
            "Missing values remain after "
            "median imputation!"
        )

    print(
        "Missing values after imputation:",
        missing_after
    )

    # --------------------------------------------------------
    # SCALE FEATURES
    # --------------------------------------------------------

    scaled_features = scaler.transform(
        feature_data
    )

    print(
        "Features scaled successfully."
    )

    # --------------------------------------------------------
    # SVM PREDICTION
    # --------------------------------------------------------

    predictions = model.predict(
        scaled_features
    )

    # --------------------------------------------------------
    # PREDICTION PROBABILITIES
    # --------------------------------------------------------

    probabilities = model.predict_proba(
        scaled_features
    )

    # --------------------------------------------------------
    # USE ORIGINAL 5-SECOND SEGMENT TIMING
    # --------------------------------------------------------

    start_times = features[
        "start_time"
    ].to_numpy()

    end_times = features[
        "end_time"
    ].to_numpy()

    # --------------------------------------------------------
    # CREATE RESULT DATAFRAME
    # --------------------------------------------------------

    results = pd.DataFrame({

        "segment": np.arange(
            len(predictions)
        ),

        "start_time": start_times,

        "end_time": end_times,

        "prediction": predictions,

        "status": [
            "Seizure"
            if prediction == 1
            else "Non-Seizure"
            for prediction in predictions
        ],

        "non_seizure_probability":
            probabilities[:, 0],

        "seizure_probability":
            probabilities[:, 1]
    })

    # --------------------------------------------------------
    # SUMMARY
    # --------------------------------------------------------

    seizure_count = int(
        (predictions == 1).sum()
    )

    non_seizure_count = int(
        (predictions == 0).sum()
    )

    print("=" * 60)
    print("PREDICTION COMPLETED")
    print("=" * 60)

    print(
        "Total segments:",
        len(predictions)
    )

    print(
        "Seizure segments:",
        seizure_count
    )

    print(
        "Non-seizure segments:",
        non_seizure_count
    )

    print("=" * 60)

    return results