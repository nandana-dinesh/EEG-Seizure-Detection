from fastapi import APIRouter, HTTPException, Form
from app.database.connection import SessionLocal
from sqlalchemy import text

from datetime import datetime, timedelta
import random
import bcrypt


# =========================================================
# ADMIN ROUTER
# =========================================================

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# =========================================================
# ADMIN OTP STORAGE
# =========================================================

admin_reset_otps = {}


# =========================================================
# ADMIN LOGIN
# =========================================================

@router.post("/login")
def admin_login(
    email: str = Form(...),
    password: str = Form(...)
):

    db = SessionLocal()

    try:

        result = db.execute(
            text("""
                SELECT
                    admin_id,
                    name,
                    email,
                    password
                FROM admin
                WHERE LOWER(email) = :email
            """),
            {
                "email": email.strip().lower()
            }
        ).fetchone()

        if not result:

            raise HTTPException(
                status_code=401,
                detail="Invalid admin email or password."
            )

        stored_password = result.password

        password_valid = False

        # -------------------------------------------------
        # Check bcrypt password
        # -------------------------------------------------

        try:

            password_valid = bcrypt.checkpw(
                password.encode("utf-8"),
                stored_password.encode("utf-8")
            )

        except Exception:

            # Support existing plain-text admin password
            password_valid = (
                password == stored_password
            )

        if not password_valid:

            raise HTTPException(
                status_code=401,
                detail="Invalid admin email or password."
            )

        return {
            "message": "Admin login successful",
            "admin_id": result.admin_id,
            "name": result.name,
            "email": result.email
        }

    finally:

        db.close()


# =========================================================
# ADMIN DASHBOARD STATISTICS
# =========================================================

@router.get("/stats")
def admin_stats():

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Total Doctors
        # -------------------------------------------------

        total_doctors = db.execute(
            text("""
                SELECT COUNT(*)
                FROM doctor_clinician
            """)
        ).scalar() or 0


        # -------------------------------------------------
        # Total Patients
        # -------------------------------------------------

        total_patients = db.execute(
            text("""
                SELECT COUNT(*)
                FROM patients
            """)
        ).scalar() or 0


        # -------------------------------------------------
        # Total EEG Analyses
        # -------------------------------------------------

        total_analyses = db.execute(
            text("""
                SELECT COUNT(*)
                FROM eeg_analysis
            """)
        ).scalar() or 0


        # -------------------------------------------------
        # Total Reports
        # -------------------------------------------------

        total_reports = db.execute(
            text("""
                SELECT COUNT(*)
                FROM reports
            """)
        ).scalar() or 0


        return {
            "total_doctors": total_doctors,
            "total_patients": total_patients,
            "total_analyses": total_analyses,
            "total_reports": total_reports
        }

    finally:

        db.close()


# =========================================================
# FORGOT ADMIN PASSWORD
# =========================================================

@router.post("/forgot-password")
def admin_forgot_password(
    email: str
):

    email = email.strip().lower()

    db = SessionLocal()

    try:

        result = db.execute(
            text("""
                SELECT
                    admin_id,
                    name,
                    email
                FROM admin
                WHERE LOWER(email) = :email
            """),
            {
                "email": email
            }
        ).fetchone()

        if not result:

            raise HTTPException(
                status_code=404,
                detail="No administrator account found with this email."
            )


        # -------------------------------------------------
        # Generate 6-digit OTP
        # -------------------------------------------------

        otp = str(
            random.randint(
                100000,
                999999
            )
        )


        # -------------------------------------------------
        # Store OTP for 5 minutes
        # -------------------------------------------------

        admin_reset_otps[email] = {
            "otp": otp,
            "expires_at": datetime.now() + timedelta(minutes=5)
        }


        # -------------------------------------------------
        # Development OTP
        # -------------------------------------------------

        print()
        print("========================================")
        print("ADMIN PASSWORD RESET OTP")
        print("Email:", email)
        print("OTP:", otp)
        print("Expires in: 5 minutes")
        print("========================================")
        print()


        return {
            "message": "OTP generated successfully.",
            "development_otp": otp
        }

    finally:

        db.close()


# =========================================================
# VERIFY ADMIN OTP
# =========================================================

@router.post("/verify-otp")
def verify_admin_otp(
    email: str,
    otp: str
):

    email = email.strip().lower()
    otp = otp.strip()


    # -----------------------------------------------------
    # Find OTP
    # -----------------------------------------------------

    otp_data = admin_reset_otps.get(email)

    if not otp_data:

        raise HTTPException(
            status_code=400,
            detail="OTP not found. Please request a new OTP."
        )


    # -----------------------------------------------------
    # Check OTP expiry
    # -----------------------------------------------------

    if datetime.now() > otp_data["expires_at"]:

        del admin_reset_otps[email]

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP."
        )


    # -----------------------------------------------------
    # Check OTP
    # -----------------------------------------------------

    if otp_data["otp"] != otp:

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP."
        )


    return {
        "message": "OTP verified successfully."
    }


# =========================================================
# RESET ADMIN PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_admin_password(
    email: str,
    otp: str,
    new_password: str
):

    email = email.strip().lower()
    otp = otp.strip()


    # -----------------------------------------------------
    # Validate password
    # -----------------------------------------------------

    if len(new_password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters."
        )


    # -----------------------------------------------------
    # Find OTP
    # -----------------------------------------------------

    otp_data = admin_reset_otps.get(email)

    if not otp_data:

        raise HTTPException(
            status_code=400,
            detail="OTP not found. Please request a new OTP."
        )


    # -----------------------------------------------------
    # Check OTP expiry
    # -----------------------------------------------------

    if datetime.now() > otp_data["expires_at"]:

        del admin_reset_otps[email]

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP."
        )


    # -----------------------------------------------------
    # Check OTP
    # -----------------------------------------------------

    if otp_data["otp"] != otp:

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP."
        )


    # -----------------------------------------------------
    # Hash new password
    # -----------------------------------------------------

    hashed_password = bcrypt.hashpw(
        new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


    # -----------------------------------------------------
    # Update admin password
    # -----------------------------------------------------

    db = SessionLocal()

    try:

        result = db.execute(
            text("""
                UPDATE admin
                SET password = :password
                WHERE LOWER(email) = :email
            """),
            {
                "password": hashed_password,
                "email": email
            }
        )


        if result.rowcount == 0:

            raise HTTPException(
                status_code=404,
                detail="Administrator account not found."
            )


        db.commit()


        # -------------------------------------------------
        # Delete used OTP
        # -------------------------------------------------

        del admin_reset_otps[email]


        return {
            "message": "Admin password reset successfully."
        }

    finally:

        db.close()


# =========================================================
# GET ALL DOCTORS
# =========================================================

@router.get("/doctors")
def get_all_doctors():

    db = SessionLocal()

    try:

        result = db.execute(
            text("""
                SELECT
                    doctor_id,
                    name,
                    email,
                    phone
                FROM doctor_clinician
                ORDER BY doctor_id DESC
            """)
        ).fetchall()


        doctors = []

        for row in result:

            doctors.append({
                "doctor_id": row.doctor_id,
                "name": row.name,
                "email": row.email,
                "phone": row.phone
            })


        # IMPORTANT:
        # React expects:
        #
        # {
        #     "doctors": [...]
        # }
        #
        # because App.jsx uses:
        # setDoctors(data.doctors || []);

        return {
            "doctors": doctors
        }

    finally:

        db.close()


# =========================================================
# ADD DOCTOR
# =========================================================

@router.post("/doctors")
def add_doctor(data: dict):

    # -----------------------------------------------------
    # Get data sent by React
    # -----------------------------------------------------

    name = str(
        data.get("name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )


    # -----------------------------------------------------
    # Validate name
    # -----------------------------------------------------

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Doctor name is required."
        )


    # -----------------------------------------------------
    # Validate email
    # -----------------------------------------------------

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Doctor email is required."
        )


    # -----------------------------------------------------
    # Validate password
    # -----------------------------------------------------

    if not password:

        raise HTTPException(
            status_code=400,
            detail="Doctor password is required."
        )


    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters."
        )


    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Check duplicate email
        # -------------------------------------------------

        existing = db.execute(
            text("""
                SELECT doctor_id
                FROM doctor_clinician
                WHERE LOWER(email) = :email
            """),
            {
                "email": email
            }
        ).fetchone()


        if existing:

            raise HTTPException(
                status_code=400,
                detail="A doctor with this email already exists."
            )


        # -------------------------------------------------
        # Hash password
        # -------------------------------------------------

        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")


        # -------------------------------------------------
        # Insert doctor
        # -------------------------------------------------

        result = db.execute(
            text("""
                INSERT INTO doctor_clinician
                (
                    name,
                    email,
                    password
                )
                VALUES
                (
                    :name,
                    :email,
                    :password
                )
            """),
            {
                "name": name,
                "email": email,
                "password": hashed_password
            }
        )


        db.commit()


        return {
            "message": "Doctor added successfully.",
            "doctor_id": result.lastrowid
        }

    finally:

        db.close()


# =========================================================
# UPDATE DOCTOR
# =========================================================

@router.put("/doctors/{doctor_id}")
def update_doctor(
    doctor_id: int,
    data: dict
):

    # -----------------------------------------------------
    # Get data from React
    # -----------------------------------------------------

    name = str(
        data.get("name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )


    # -----------------------------------------------------
    # Validate name
    # -----------------------------------------------------

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Doctor name is required."
        )


    # -----------------------------------------------------
    # Validate email
    # -----------------------------------------------------

    if not email:

        raise HTTPException(
            status_code=400,
            detail="Doctor email is required."
        )


    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Check doctor exists
        # -------------------------------------------------

        existing = db.execute(
            text("""
                SELECT doctor_id
                FROM doctor_clinician
                WHERE doctor_id = :doctor_id
            """),
            {
                "doctor_id": doctor_id
            }
        ).fetchone()


        if not existing:

            raise HTTPException(
                status_code=404,
                detail="Doctor not found."
            )


        # -------------------------------------------------
        # Check duplicate email
        # -------------------------------------------------

        duplicate = db.execute(
            text("""
                SELECT doctor_id
                FROM doctor_clinician
                WHERE LOWER(email) = :email
                AND doctor_id != :doctor_id
            """),
            {
                "email": email,
                "doctor_id": doctor_id
            }
        ).fetchone()


        if duplicate:

            raise HTTPException(
                status_code=400,
                detail="Another doctor already uses this email."
            )


        # -------------------------------------------------
        # Update name and email
        # -------------------------------------------------

        if not password:

            db.execute(
                text("""
                    UPDATE doctor_clinician
                    SET
                        name = :name,
                        email = :email
                    WHERE doctor_id = :doctor_id
                """),
                {
                    "doctor_id": doctor_id,
                    "name": name,
                    "email": email
                }
            )


        # -------------------------------------------------
        # Update name, email and password
        # -------------------------------------------------

        else:

            if len(password) < 6:

                raise HTTPException(
                    status_code=400,
                    detail="Password must contain at least 6 characters."
                )


            hashed_password = bcrypt.hashpw(
                password.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")


            db.execute(
                text("""
                    UPDATE doctor_clinician
                    SET
                        name = :name,
                        email = :email,
                        password = :password
                    WHERE doctor_id = :doctor_id
                """),
                {
                    "doctor_id": doctor_id,
                    "name": name,
                    "email": email,
                    "password": hashed_password
                }
            )


        db.commit()


        return {
            "message": "Doctor updated successfully."
        }

    finally:

        db.close()


# =========================================================
# DELETE DOCTOR
# =========================================================

@router.delete("/doctors/{doctor_id}")
def delete_doctor(
    doctor_id: int
):

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Check doctor exists
        # -------------------------------------------------

        existing = db.execute(
            text("""
                SELECT doctor_id
                FROM doctor_clinician
                WHERE doctor_id = :doctor_id
            """),
            {
                "doctor_id": doctor_id
            }
        ).fetchone()


        if not existing:

            raise HTTPException(
                status_code=404,
                detail="Doctor not found."
            )


        # -------------------------------------------------
        # Delete doctor
        # -------------------------------------------------

        db.execute(
            text("""
                DELETE FROM doctor_clinician
                WHERE doctor_id = :doctor_id
            """),
            {
                "doctor_id": doctor_id
            }
        )


        db.commit()


        return {
            "message": "Doctor deleted successfully."
        }

    finally:

        db.close()