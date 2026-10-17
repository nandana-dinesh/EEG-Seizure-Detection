# Silent Seizure Detection System Using Machine Learning and EEG Signals

## Project Overview

The Silent Seizure Detection System is a web-based application developed to help doctors and healthcare professionals analyze Electroencephalogram (EEG) recordings and detect patterns associated with epileptic seizures. The system processes uploaded EEG files, extracts relevant features, and uses a Machine Learning model to classify EEG signals as seizure or non-seizure.

The application provides patient management, EEG analysis, prediction history, report generation, and administrator functionalities.

## Objectives

- To develop a web-based silent seizure detection system using EEG signals.
- To allow doctors to upload EEG recordings in EDF format.
- To preprocess EEG signals using filtering, referencing, and segmentation techniques.
- To extract statistical, frequency-domain, and wavelet-based features.
- To classify EEG signals using a Support Vector Machine (SVM) model.
- To display prediction results and maintain analysis history.
- To generate downloadable reports.
- To provide an administrator dashboard for managing doctor accounts.

## Features

### Doctor / Clinician
- Secure login.
- Add, view, update, and delete patient records.
- Upload EEG recordings for analysis.
- View seizure prediction results.
- Access previous EEG analysis history.
- Generate and download PDF reports.

### Administrator
- Administrator login and dashboard.
- View the total number of doctors, patients, EEG analyses, and reports.
- Manage doctor accounts.

### Machine Learning
- EEG signal preprocessing.
- Feature extraction using statistical, frequency-domain, and wavelet methods.
- Seizure classification using SVM with an RBF kernel.
- Storage of prediction results for future reference.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, JavaScript, HTML, CSS |
| Backend | Python, FastAPI |
| Machine Learning | Scikit-learn |
| EEG Processing | MNE-Python, PyWavelets |
| Data Processing | NumPy, SciPy, Pandas |
| Database | MySQL |
| Input Format | EDF |
| Reports | PDF |

## Machine Learning Methodology

The system follows these steps:

1. Upload an EEG recording in EDF format.
2. Preprocess the EEG signal using a 0.5–45 Hz band-pass filter and average referencing.
3. Divide the signal into 5-second windows with 50% overlap.
4. Extract statistical, frequency-domain, and Discrete Wavelet Transform (DWT) features.
5. Scale the extracted features using the saved scaler.
6. Apply the trained SVM classifier with an RBF kernel.
7. Display the seizure or non-seizure prediction.
8. Store the analysis results in the database and generate a report when requested.

## Dataset

The project uses EEG recordings from the **CHB-MIT Scalp EEG Database**, available through PhysioNet.

Dataset link: https://physionet.org/content/chbmit/

## Project Structure

```text
Silent_Seizure_Detection/
├── backend/
│   └── app/
│       ├── database/
│       ├── models/
│       ├── routers/
│       ├── services/
│       └── main.py
├── frontend/
│   ├── src/
│   └── package.json
├── Dataset/
└── README.md
```

## Installation and Execution

### Prerequisites
- Python
- Node.js and npm
- MySQL Server

### 1. Configure the Database

Create the MySQL database:

```sql
CREATE DATABASE silent_seizure_db;
```

Configure the database connection according to the backend settings and ensure that all required tables are created.

### 2. Run the Backend

Open a terminal and execute:

```bash
cd backend
venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

Backend URL: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

### 3. Run the Frontend

Open another terminal and execute:

```bash
cd frontend
npm install
npm run dev
```

Open the local frontend URL displayed in the terminal. In the current development setup, it is usually:

http://localhost:5173/

## Model Evaluation

The previously recorded model evaluation results are:

| Metric | Score |
|---|---:|
| Accuracy | 98.75% |
| Precision | 81.82% |
| Recall | 69.23% |
| F1-Score | 75.00% |

These results should be verified against the final trained model and evaluation dataset before submission.

## Future Enhancements

- Improve model performance using additional EEG datasets.
- Validate the model on independent patient recordings.
- Introduce additional machine learning and deep learning techniques.
- Improve visualization of EEG signals and prediction results.
- Explore real-time EEG monitoring after appropriate validation.

## Disclaimer

This project is developed for academic and research purposes. Its predictions are intended to support further review and must not be treated as a medical diagnosis. Clinical decisions must be made by qualified healthcare professionals.

## Author

**Institution:** Muthoot Institute of Technology and Science (MITS), Kochi  
**Degree:** Master of Computer Applications (MCA)  
**Project Title:** Silent Seizure Detection System Using Machine Learning and EEG Signals
