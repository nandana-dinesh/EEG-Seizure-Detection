from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    prediction,
    patients,
    reports,
    doctors,
    history,
    doctor_patients,
    admin
)


# =====================================================
# CREATE FASTAPI APP
# =====================================================

app = FastAPI(
    title="Silent Seizure Detection System"
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# ROOT
# =====================================================

@app.get("/")
def root():

    return {
        "message": "Silent Seizure Detection System API is running"
    }


# =====================================================
# INCLUDE ROUTERS
# =====================================================

app.include_router(prediction.router)

app.include_router(patients.router)

app.include_router(reports.router)

app.include_router(doctors.router)

app.include_router(history.router)

app.include_router(doctor_patients.router)

# IMPORTANT:
# All /admin/... routes come from admin.router

app.include_router(admin.router)