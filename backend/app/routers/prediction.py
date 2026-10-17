import os

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.services.predictor import predict_edf
from app.database.connection import SessionLocal
from app.models.database_models import EEGAnalysis


router = APIRouter(
    prefix="/prediction",
    tags=["Prediction"]
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------
# SEIZURE CONFIRMATION SETTINGS
# ---------------------------------------------------------

# Minimum seizure probability required for a segment
MIN_SEIZURE_PROBABILITY = 0.80

# Minimum number of consecutive confirmed segments
MIN_CONSECUTIVE_SEGMENTS = 2


# ---------------------------------------------------------
# FIND CONSECUTIVE SEIZURE GROUPS
# ---------------------------------------------------------

def find_seizure_groups(results_df):

    predictions = results_df["confirmed_prediction"].to_numpy()

    groups = []

    start_idx = None

    for i, value in enumerate(predictions):

        if value == 1:

            if start_idx is None:
                start_idx = i

        else:

            if start_idx is not None:

                groups.append(
                    (start_idx, i - 1)
                )

                start_idx = None

    # Handle seizure group reaching the end
    if start_idx is not None:

        groups.append(
            (start_idx, len(predictions) - 1)
        )

    return groups


# ---------------------------------------------------------
# ANALYZE EEG
# ---------------------------------------------------------

@router.post("/analyze")
async def analyze_eeg(
    patient_id: int = Form(...),
    file: UploadFile = File(...)
):

    # -----------------------------------------------------
    # 1. CHECK FILE
    # -----------------------------------------------------

    if not file.filename.lower().endswith(".edf"):

        raise HTTPException(
            status_code=400,
            detail="Only EDF files are allowed."
        )


    # -----------------------------------------------------
    # 2. CHECK PATIENT
    # -----------------------------------------------------

    db = SessionLocal()

    try:

        from sqlalchemy import text

        result = db.execute(
            text(
                "SELECT patient_id "
                "FROM patients "
                "WHERE patient_id = :patient_id"
            ),
            {
                "patient_id": patient_id
            }
        ).fetchone()

        if result is None:

            raise HTTPException(
                status_code=404,
                detail="Patient not found."
            )

    finally:

        db.close()


    # -----------------------------------------------------
    # 3. SAVE EDF FILE
    # -----------------------------------------------------

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:

        buffer.write(
            await file.read()
        )


    # -----------------------------------------------------
    # 4. RUN ML PREDICTION
    # -----------------------------------------------------

    try:

        results_df = predict_edf(
            file_path
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"EEG analysis failed: {str(e)}"
        )


    # -----------------------------------------------------
    # 5. RAW MODEL RESULTS
    # -----------------------------------------------------

    total_segments = len(results_df)

    raw_seizure_segments = int(
        (
            results_df["prediction"] == 1
        ).sum()
    )

    raw_non_seizure_segments = int(
        (
            results_df["prediction"] == 0
        ).sum()
    )


    # -----------------------------------------------------
    # 6. APPLY PROBABILITY THRESHOLD
    # -----------------------------------------------------

    results_df["confirmed_prediction"] = (
        (results_df["prediction"] == 1) &
        (
            results_df["seizure_probability"]
            >= MIN_SEIZURE_PROBABILITY
        )
    ).astype(int)


    # Number of segments that passed the probability threshold
    probability_confirmed_segments = int(
        results_df["confirmed_prediction"].sum()
    )


    # -----------------------------------------------------
    # 7. FIND CONSECUTIVE CONFIRMED GROUPS
    # -----------------------------------------------------

    seizure_groups = find_seizure_groups(
        results_df
    )


    # -----------------------------------------------------
    # 8. CONFIRM ONLY SUFFICIENTLY LONG GROUPS
    # -----------------------------------------------------

    confirmed_groups = []

    for start_idx, end_idx in seizure_groups:

        group_length = (
            end_idx - start_idx + 1
        )

        if group_length >= MIN_CONSECUTIVE_SEGMENTS:

            confirmed_groups.append(
                (start_idx, end_idx)
            )


    # -----------------------------------------------------
    # 9. GET CONFIRMED SEIZURE SEGMENTS
    # -----------------------------------------------------

    confirmed_indices = set()

    for start_idx, end_idx in confirmed_groups:

        for index in range(
            start_idx,
            end_idx + 1
        ):

            confirmed_indices.add(index)


    confirmed_seizure_segments = len(
        confirmed_indices
    )

    confirmed_non_seizure_segments = (
        total_segments -
        confirmed_seizure_segments
    )


    # -----------------------------------------------------
    # 10. FINAL FILE-LEVEL PREDICTION
    # -----------------------------------------------------

    if len(confirmed_groups) > 0:

        overall_prediction = "Seizure Detected"

    else:

        overall_prediction = "No Seizure Detected"


    # -----------------------------------------------------
    # 11. PROBABILITY VALUES
    # -----------------------------------------------------

    # Maximum probability in the entire EEG file
    max_raw_probability = float(
        results_df["seizure_probability"].max()
    )


    # Maximum probability among confirmed seizure segments
    if confirmed_indices:

        confirmed_probabilities = (
            results_df
            .iloc[
                sorted(confirmed_indices)
            ]["seizure_probability"]
        )

        max_seizure_probability = float(
            confirmed_probabilities.max()
        )

    else:

        max_seizure_probability = 0.0


    # -----------------------------------------------------
    # 12. PRINT DEBUG INFORMATION
    # -----------------------------------------------------

    print()
    print("=" * 60)
    print("EEG ANALYSIS RESULT")
    print("=" * 60)

    print(
        f"File: {file.filename}"
    )

    print(
        f"Total segments: {total_segments}"
    )

    print(
        f"Raw seizure segments: "
        f"{raw_seizure_segments}"
    )

    print(
        f"Raw non-seizure segments: "
        f"{raw_non_seizure_segments}"
    )

    print(
        f"Probability-confirmed segments: "
        f"{probability_confirmed_segments}"
    )

    print(
        f"Raw seizure groups: "
        f"{len(seizure_groups)}"
    )

    print(
        f"Confirmed seizure groups: "
        f"{len(confirmed_groups)}"
    )

    print(
        f"Confirmed seizure segments: "
        f"{confirmed_seizure_segments}"
    )

    print(
        f"Maximum raw seizure probability: "
        f"{max_raw_probability:.6f}"
    )

    print(
        f"Maximum confirmed seizure probability: "
        f"{max_seizure_probability:.6f}"
    )

    print(
        f"Final prediction: "
        f"{overall_prediction}"
    )


    # -----------------------------------------------------
    # 13. PRINT CONFIRMED GROUPS
    # -----------------------------------------------------

    print()
    print("CONFIRMED SEIZURE GROUPS")
    print("-" * 60)

    if confirmed_groups:

        for start_idx, end_idx in confirmed_groups:

            start_time = float(
                results_df.iloc[
                    start_idx
                ]["start_time"]
            )

            end_time = float(
                results_df.iloc[
                    end_idx
                ]["end_time"]
            )

            count = (
                end_idx - start_idx + 1
            )

            print(
                f"{start_time:.1f}s - "
                f"{end_time:.1f}s "
                f"({count} consecutive segments)"
            )

    else:

        print(
            "No confirmed seizure groups."
        )


    # -----------------------------------------------------
    # 14. SAVE RESULT TO DATABASE
    # -----------------------------------------------------

    db = SessionLocal()

    try:

        analysis = EEGAnalysis(
            patient_id=patient_id,
            eeg_file=file.filename,
            model_used="SVM",
            prediction=overall_prediction,
            seizure_probability=max_raw_probability
        )

        db.add(analysis)

        db.commit()

        db.refresh(analysis)

        analysis_id = analysis.analysis_id

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to save analysis: "
                f"{str(e)}"
            )
        )

    finally:

        db.close()


    # -----------------------------------------------------
    # 15. RETURN RESPONSE
    # -----------------------------------------------------

    return {

        "analysis_id": analysis_id,

        "patient_id": patient_id,

        "file": file.filename,

        "total_segments": total_segments,

        "raw_seizure_segments":
            raw_seizure_segments,

        "raw_non_seizure_segments":
            raw_non_seizure_segments,

        "probability_confirmed_segments":
            probability_confirmed_segments,

        "confirmed_seizure_segments":
            confirmed_seizure_segments,

        "confirmed_non_seizure_segments":
            confirmed_non_seizure_segments,

        "confirmed_seizure_groups":
            len(confirmed_groups),

        "prediction":
            overall_prediction,

        # Maximum probability from all segments
        "seizure_probability":
            max_raw_probability,

        "results":
            results_df.to_dict(
                orient="records"
            )
    }