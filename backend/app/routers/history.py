from fastapi import APIRouter, HTTPException
from app.database.connection import SessionLocal
from sqlalchemy import text


router = APIRouter(
    prefix="/history",
    tags=["Analysis History"]
)


@router.get("/patient/{patient_id}")
def get_patient_history(patient_id: int):

    db = SessionLocal()

    try:
        # Check whether patient exists
        patient = db.execute(
            text("""
                SELECT patient_id, name
                FROM patients
                WHERE patient_id = :patient_id
            """),
            {"patient_id": patient_id}
        ).fetchone()

        if not patient:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        # Get all EEG analyses for this patient
        analyses = db.execute(
            text("""
                SELECT
                    analysis_id,
                    patient_id,
                    eeg_file,
                    model_used,
                    prediction,
                    seizure_probability,
                    analysis_date
                FROM eeg_analysis
                WHERE patient_id = :patient_id
                ORDER BY analysis_date DESC, analysis_id DESC
            """),
            {"patient_id": patient_id}
        ).fetchall()

        return {
            "patient_id": patient.patient_id,
            "patient_name": patient.name,
            "total_analyses": len(analyses),
            "analyses": [
                {
                    "analysis_id": row.analysis_id,
                    "eeg_file": row.eeg_file,
                    "model_used": row.model_used,
                    "prediction": row.prediction,
                    "seizure_probability": row.seizure_probability,
                    "analysis_date": row.analysis_date
                }
                for row in analyses
            ]
        }

    finally:
        db.close()

@router.get("/patient/all/{doctor_id}")
def get_doctor_history(doctor_id: int):

    db = SessionLocal()

    try:
        analyses = db.execute(
            text("""
                SELECT
                    ea.analysis_id,
                    ea.patient_id,
                    p.name AS patient_name,
                    ea.eeg_file,
                    ea.model_used,
                    ea.prediction,
                    ea.seizure_probability,
                    ea.analysis_date
                FROM eeg_analysis ea
                INNER JOIN patients p
                    ON ea.patient_id = p.patient_id
                INNER JOIN doctor_patients dp
                    ON ea.patient_id = dp.patient_id
                WHERE dp.doctor_id = :doctor_id
                ORDER BY ea.analysis_date DESC, ea.analysis_id DESC
            """),
            {"doctor_id": doctor_id}
        ).fetchall()

        return [
            {
                "analysis_id": row.analysis_id,
                "patient_id": row.patient_id,
                "patient_name": row.patient_name,
                "eeg_file": row.eeg_file,
                "model_used": row.model_used,
                "prediction": row.prediction,
                "seizure_probability": row.seizure_probability,
                "analysis_date": row.analysis_date
            }
            for row in analyses
        ]

    finally:
        db.close()
