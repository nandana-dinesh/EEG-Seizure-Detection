from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database.connection import SessionLocal
from app.models.database_models import EEGAnalysis
from sqlalchemy import text

router = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str
    contact: str
    address: str


@router.post("/")
def create_patient(patient: PatientCreate):

    db = SessionLocal()

    try:
        query = text("""
            INSERT INTO patients
            (name, age, gender, contact, address)
            VALUES
            (:name, :age, :gender, :contact, :address)
        """)

        result = db.execute(
            query,
            {
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "contact": patient.contact,
                "address": patient.address
            }
        )

        db.commit()

        patient_id = result.lastrowid

        return {
            "message": "Patient created successfully",
            "patient_id": patient_id
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create patient: {str(e)}"
        )

    finally:
        db.close()


@router.get("/")
def get_all_patients():

    db = SessionLocal()

    try:
        query = text("""
            SELECT
                patient_id,
                name,
                age,
                gender,
                contact,
                address
            FROM patients
            ORDER BY patient_id DESC
        """)

        result = db.execute(query)

        patients = []

        for row in result:
            patients.append({
                "patient_id": row.patient_id,
                "name": row.name,
                "age": row.age,
                "gender": row.gender,
                "contact": row.contact,
                "address": row.address
            })

        return patients

    finally:
        db.close()


@router.get("/{patient_id}")
def get_patient(patient_id: int):

    db = SessionLocal()

    try:
        query = text("""
            SELECT
                patient_id,
                name,
                age,
                gender,
                contact,
                address
            FROM patients
            WHERE patient_id = :patient_id
        """)

        row = db.execute(
            query,
            {"patient_id": patient_id}
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        return {
            "patient_id": row.patient_id,
            "name": row.name,
            "age": row.age,
            "gender": row.gender,
            "contact": row.contact,
            "address": row.address
        }

    finally:
        db.close()


@router.put("/{patient_id}")
def update_patient(
    patient_id: int,
    patient: PatientCreate
):

    db = SessionLocal()

    try:
        query = text("""
            UPDATE patients
            SET
                name = :name,
                age = :age,
                gender = :gender,
                contact = :contact,
                address = :address
            WHERE patient_id = :patient_id
        """)

        result = db.execute(
            query,
            {
                "patient_id": patient_id,
                "name": patient.name,
                "age": patient.age,
                "gender": patient.gender,
                "contact": patient.contact,
                "address": patient.address
            }
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Patient not found"
            )

        db.commit()

        return {
            "message": "Patient updated successfully",
            "patient_id": patient_id
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to update patient: {str(e)}"
        )

    finally:
        db.close()


@router.delete("/{patient_id}")
def delete_patient(patient_id: int):

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # 1. CHECK PATIENT EXISTS
        # -------------------------------------------------

        patient = db.execute(
            text("""
                SELECT patient_id, name
                FROM patients
                WHERE patient_id = :patient_id
            """),
            {
                "patient_id": patient_id
            }
        ).fetchone()

        if not patient:

            raise HTTPException(
                status_code=404,
                detail="Patient not found."
            )


        # -------------------------------------------------
        # 2. GET ANALYSIS IDs FOR THIS PATIENT
        # -------------------------------------------------

        analyses = db.execute(
            text("""
                SELECT analysis_id
                FROM eeg_analysis
                WHERE patient_id = :patient_id
            """),
            {
                "patient_id": patient_id
            }
        ).fetchall()


        analysis_ids = [
            row.analysis_id
            for row in analyses
        ]


        # -------------------------------------------------
        # 3. DELETE REPORTS
        # -------------------------------------------------
        # Reports depend on eeg_analysis.
        # Therefore reports must be deleted first.

        if analysis_ids:

            for analysis_id in analysis_ids:

                db.execute(
                    text("""
                        DELETE FROM reports
                        WHERE analysis_id = :analysis_id
                    """),
                    {
                        "analysis_id": analysis_id
                    }
                )


        # -------------------------------------------------
        # 4. DELETE EEG ANALYSIS RECORDS
        # -------------------------------------------------

        db.execute(
            text("""
                DELETE FROM eeg_analysis
                WHERE patient_id = :patient_id
            """),
            {
                "patient_id": patient_id
            }
        )


        # -------------------------------------------------
        # 5. DELETE DOCTOR-PATIENT ASSIGNMENTS
        # -------------------------------------------------

        db.execute(
            text("""
                DELETE FROM doctor_patients
                WHERE patient_id = :patient_id
            """),
            {
                "patient_id": patient_id
            }
        )


        # -------------------------------------------------
        # 6. DELETE PATIENT
        # -------------------------------------------------

        db.execute(
            text("""
                DELETE FROM patients
                WHERE patient_id = :patient_id
            """),
            {
                "patient_id": patient_id
            }
        )


        # -------------------------------------------------
        # 7. COMMIT EVERYTHING
        # -------------------------------------------------

        db.commit()


        return {
            "message": "Patient deleted successfully.",
            "patient_id": patient_id,
            "patient_name": patient.name
        }


    except HTTPException:

        db.rollback()
        raise


    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete patient: {str(e)}"
        )


    finally:

        db.close()