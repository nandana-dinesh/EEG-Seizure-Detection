from sqlalchemy import Column, Integer, String, Float, DateTime, text
from app.database.connection import Base


class EEGAnalysis(Base):
    __tablename__ = "eeg_analysis"

    analysis_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, nullable=False)
    eeg_file = Column(String(255), nullable=False)
    model_used = Column(String(100), nullable=True)
    prediction = Column(String(50), nullable=True)
    seizure_probability = Column(Float, nullable=True)
    analysis_date = Column(
    DateTime,
    nullable=False,
    server_default=text("CURRENT_TIMESTAMP")
)
class Report(Base):
    __tablename__ = "reports"

    report_id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_id = Column(Integer, nullable=False)
    report_file = Column(String(255), nullable=True)

    generated_date = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )
class DoctorClinician(Base):
    __tablename__ = "doctor_clinician"

    doctor_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    password = Column(String(255), nullable=False)