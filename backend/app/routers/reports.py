
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.database.connection import SessionLocal
from app.models.database_models import Report
from app.services.pdf_report import generate_pdf_report
from sqlalchemy import text
import os

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate/{analysis_id}")
def generate_report(analysis_id: int):
    db = SessionLocal()

    try:
        # Fetch examination, patient, and assigned doctor details
        result = db.execute(
            text("""
                SELECT
                    ea.analysis_id,
                    ea.patient_id,
                    ea.eeg_file,
                    ea.prediction,
                    ea.seizure_probability,
                    ea.analysis_date,
                    dc.name AS doctor_name,
                    p.name AS patient_name,
                    p.age AS patient_age,
                    p.gender AS patient_gender
                FROM eeg_analysis ea
                INNER JOIN patients p
                    ON ea.patient_id = p.patient_id
                INNER JOIN doctor_patients dp
                    ON ea.patient_id = dp.patient_id
                INNER JOIN doctor_clinician dc
                    ON dp.doctor_id = dc.doctor_id
                WHERE ea.analysis_id = :analysis_id
                LIMIT 1
            """),
            {"analysis_id": analysis_id}
        ).fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Analysis not found, or the patient "
                    "has no assigned doctor."
                )
            )

        # Create the reports directory
        reports_dir = "reports"
        os.makedirs(reports_dir, exist_ok=True)

        filename = f"analysis_{analysis_id}_report.pdf"
        report_path = os.path.join(reports_dir, filename)

        # Generate the PDF
        generate_pdf_report(
            analysis_id=result.analysis_id,
            patient_id=result.patient_id,
            patient_name=result.patient_name,
            patient_age=result.patient_age,
            patient_gender=result.patient_gender,
            eeg_file=result.eeg_file,
            doctor_name=result.doctor_name,
            prediction=result.prediction,
            seizure_probability=result.seizure_probability,
            analysis_date=result.analysis_date,
            report_path=report_path
        )

        # Save report details in the database
        report = Report(
            analysis_id=analysis_id,
            report_file=report_path
        )

        db.add(report)
        db.commit()
        db.refresh(report)

        return {
            "message": "PDF report generated successfully",
            "report_id": report.report_id,
            "analysis_id": analysis_id,
            "report_file": report_path,
            "generated_date": report.generated_date
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(e)}"
        )

    finally:
        db.close()


@router.get("/")
def get_reports():
    db = SessionLocal()

    try:
        result = db.execute(
            text("""
                SELECT
                    r.report_id,
                    r.analysis_id,
                    r.report_file,
                    r.generated_date,
                    ea.patient_id,
                    ea.eeg_file,
                    ea.prediction,
                    ea.seizure_probability,
                    p.name AS patient_name,
                    p.age AS patient_age,
                    p.gender AS patient_gender,
                    dc.name AS doctor_name
                FROM reports r
                INNER JOIN eeg_analysis ea
                    ON r.analysis_id = ea.analysis_id
                INNER JOIN patients p
                    ON ea.patient_id = p.patient_id
                INNER JOIN doctor_patients dp
                    ON ea.patient_id = dp.patient_id
                INNER JOIN doctor_clinician dc
                    ON dp.doctor_id = dc.doctor_id
                ORDER BY r.generated_date DESC
            """)
        ).fetchall()

        reports = []

        for row in result:
            reports.append({
                "report_id": row.report_id,
                "analysis_id": row.analysis_id,
                "report_file": row.report_file,
                "generated_date": row.generated_date,
                "patient_id": row.patient_id,
                "patient_name": row.patient_name,
                "patient_age": row.patient_age,
                "patient_gender": row.patient_gender,
                "eeg_file": row.eeg_file,
                "prediction": row.prediction,
                "seizure_probability": row.seizure_probability,
                "doctor_name": row.doctor_name
            })

        return reports

    finally:
        db.close()


@router.get("/download/{report_id}")
def download_report(report_id: int):
    db = SessionLocal()

    try:
        result = db.execute(
            text("""
                SELECT report_file
                FROM reports
                WHERE report_id = :report_id
            """),
            {"report_id": report_id}
        ).fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Report not found"
            )

        report_path = result.report_file

        if not os.path.exists(report_path):
            raise HTTPException(
                status_code=404,
                detail="Report file not found"
            )

        return FileResponse(
            path=report_path,
            media_type="application/pdf",
            filename=os.path.basename(report_path)
        )

    finally:
        db.close()
