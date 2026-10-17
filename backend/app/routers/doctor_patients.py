from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database.connection import SessionLocal
from sqlalchemy import text


router = APIRouter(
    prefix="/doctor-patients",
    tags=["Doctor Patients"]
)


class PatientAssignCreate(BaseModel):
    doctor_id: int
    name: str
    age: int
    gender: str
    contact: str
    address: str


@router.post("/add")
def add_patient_by_doctor(patient: PatientAssignCreate):

    db = SessionLocal()

    try:
        # 1. Check whether doctor exists
        doctor = db.execute(
            text("""
                SELECT doctor_id
                FROM doctor_clinician
                WHERE doctor_id = :doctor_id
            """),
            {"doctor_id": patient.doctor_id}
        ).fetchone()

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Doctor/Clinician not found"
            )

        # 2. Create patient
        result = db.execute(
            text("""
                INSERT INTO patients
                (name, age, gender, contact, address)
                VALUES
                (:name, :age, :gender, :contact, :address)
            """),
            {
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "contact": patient.contact,
                "address": patient.address
            }
        )

        patient_id = result.lastrowid

        # 3. Automatically assign patient to doctor
        db.execute(
            text("""
                INSERT INTO doctor_patients
                (doctor_id, patient_id)
                VALUES
                (:doctor_id, :patient_id)
            """),
            {
                "doctor_id": patient.doctor_id,
                "patient_id": patient_id
            }
        )

        # 4. Save both operations
        db.commit()

        return {
            "message": "Patient created and assigned successfully",
            "patient_id": patient_id,
            "doctor_id": patient.doctor_id
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to add patient: {str(e)}"
        )

    finally:
        db.close()


@router.get("/{doctor_id}")
def get_doctor_patients(doctor_id: int):

    db = SessionLocal()

    try:
        # Check whether doctor exists
        doctor = db.execute(
            text("""
                SELECT doctor_id, name, email
                FROM doctor_clinician
                WHERE doctor_id = :doctor_id
            """),
            {"doctor_id": doctor_id}
        ).fetchone()

        if not doctor:
            raise HTTPException(
                status_code=404,
                detail="Doctor/Clinician not found"
            )

        # Get patients assigned to this doctor
        patients = db.execute(
            text("""
                SELECT
                    p.patient_id,
                    p.name,
                    p.age,
                    p.gender,
                    p.contact,
                    p.address,
                    dp.assigned_date
                FROM doctor_patients dp
                INNER JOIN patients p
                    ON dp.patient_id = p.patient_id
                WHERE dp.doctor_id = :doctor_id
                ORDER BY dp.assigned_date DESC
            """),
            {"doctor_id": doctor_id}
        ).fetchall()

        return {
            "doctor_id": doctor.doctor_id,
            "doctor_name": doctor.name,
            "total_patients": len(patients),
            "patients": [
                {
                    "patient_id": row.patient_id,
                    "name": row.name,
                    "age": row.age,
                    "gender": row.gender,
                    "contact": row.contact,
                    "address": row.address,
                    "assigned_date": row.assigned_date
                }
                for row in patients
            ]
        }

    finally:
        db.close()