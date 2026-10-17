from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database.connection import SessionLocal
from sqlalchemy import text
import bcrypt
import random
import time

router = APIRouter(prefix="/doctors", tags=["Doctor/Clinician"])

class DoctorCreate(BaseModel):
    name: str
    email: str
    password: str

class DoctorLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

otp_storage = {}

@router.post("/")
def create_doctor(doctor: DoctorCreate):
    name = doctor.name.strip()
    email = doctor.email.strip().lower()
    password = doctor.password

    if not name:
        raise HTTPException(status_code=400, detail="Doctor name is required")
    if not email:
        raise HTTPException(status_code=400, detail="Doctor email is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must contain at least 6 characters")

    db = SessionLocal()
    try:
        existing = db.execute(text("""
            SELECT doctor_id FROM doctor_clinician WHERE LOWER(email) = :email
        """), {"email": email}).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        result = db.execute(text("""
            INSERT INTO doctor_clinician (name, email, password)
            VALUES (:name, :email, :password)
        """), {"name": name, "email": email, "password": hashed_password})
        db.commit()
        return {"message": "Doctor/Clinician created successfully", "doctor_id": result.lastrowid}
    finally:
        db.close()

@router.post("/login")
def doctor_login(login: DoctorLogin):
    email = login.email.strip().lower()
    db = SessionLocal()
    try:
        doctor = db.execute(text("""
            SELECT doctor_id, name, email, password
            FROM doctor_clinician
            WHERE LOWER(email) = :email
        """), {"email": email}).fetchone()

        if not doctor:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        stored_password = doctor.password
        if not stored_password or not stored_password.startswith("$2"):
            raise HTTPException(
                status_code=400,
                detail="This account requires a password reset. Please use Forgot Password."
            )

        try:
            password_valid = bcrypt.checkpw(
                login.password.encode("utf-8"),
                stored_password.encode("utf-8")
            )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="This account requires a password reset. Please use Forgot Password."
            )

        if not password_valid:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "message": "Login successful",
            "doctor_id": doctor.doctor_id,
            "name": doctor.name,
            "email": doctor.email
        }
    finally:
        db.close()

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    email = request.email.strip().lower()
    db = SessionLocal()
    try:
        doctor = db.execute(text("""
            SELECT doctor_id, email
            FROM doctor_clinician
            WHERE LOWER(email) = :email
        """), {"email": email}).fetchone()
        if not doctor:
            raise HTTPException(status_code=404, detail="No doctor/clinician account found with this email")

        otp = str(random.randint(100000, 999999))
        otp_storage[email] = {"otp": otp, "expires": time.time() + 300}

        print("\n========================================")
        print("PASSWORD RESET OTP")
        print("========================================")
        print(f"Email : {email}")
        print(f"OTP   : {otp}")
        print("Valid for: 5 minutes")
        print("========================================\n")

        return {
            "message": "OTP generated successfully",
            "email": email,
            "development_otp": otp
        }
    finally:
        db.close()

@router.post("/verify-otp")
def verify_otp(request: VerifyOTPRequest):
    email = request.email.strip().lower()
    stored = otp_storage.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")
    if time.time() > stored["expires"]:
        otp_storage.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")
    if request.otp.strip() != stored["otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    return {"message": "OTP verified successfully", "email": email}

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    email = request.email.strip().lower()
    otp = request.otp.strip()

    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must contain at least 6 characters")

    stored = otp_storage.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new OTP.")
    if time.time() > stored["expires"]:
        otp_storage.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new OTP.")
    if otp != stored["otp"]:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    db = SessionLocal()
    try:
        doctor = db.execute(text("""
            SELECT doctor_id FROM doctor_clinician WHERE LOWER(email) = :email
        """), {"email": email}).fetchone()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor/Clinician account not found")

        hashed_password = bcrypt.hashpw(
            request.new_password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        db.execute(text("""
            UPDATE doctor_clinician
            SET password = :password
            WHERE LOWER(email) = :email
        """), {"password": hashed_password, "email": email})
        db.commit()
        otp_storage.pop(email, None)
        return {"message": "Password reset successfully"}
    finally:
        db.close()
