Silent Seizure Detection System Using Machine Learning and EEG Signals
A web-based application designed to help doctors and healthcare professionals analyze EEG (electroencephalogram) recordings and identify patterns that may indicate epileptic seizures. The system processes uploaded EDF files, extracts relevant signal features, and uses a trained Support Vector Machine (SVM) model to classify EEG segments as seizure or non-seizure.
Disclaimer: This is an academic prototype for research and educational purposes. It is not a medical device and must not be used as a substitute for professional medical assessment or diagnosis.

Features
Doctor / Clinician
- Log in to the application.
- Add, view, update, and delete patient records.
- Upload EEG recordings in EDF format for analysis.
- View seizure prediction results and analysis details.
- Review previous EEG analyses.
- Generate and download PDF reports.
Administrator
- Access an administrator dashboard.
- View summary counts for doctors, patients, EEG analyses, and reports.
- Manage doctor accounts.
Machine Learning
- EEG preprocessing with filtering and referencing.
- Segmentation into 5-second windows with 50% overlap.
- Feature extraction using Discrete Wavelet Transform (DWT), statistical features, and frequency-domain features.
- Classification using a Support Vector Machine (SVM) with an RBF kernel.
- Storage of analysis results for later review.
Technology Stack
Component	Technologies
Frontend	React.js, JavaScript, HTML, CSS
Backend	Python, FastAPI
Machine Learning	Scikit-learn, NumPy, SciPy, Pandas
EEG Processing	MNE-Python, PyWavelets
Database	MySQL
Input data	EEG recordings in EDF format
Reports	PDF report generation


System Workflow
1. A doctor logs in and selects or registers a patient.
2. The doctor uploads an EEG recording in EDF format.
3. The backend preprocesses the EEG signal.
4. The signal is divided into 5-second windows with 50% overlap.
5. Statistical, wavelet-based, and frequency-domain features are extracted.
6. The saved scaler and trained SVM model process the features and produce predictions.
7. The application displays the analysis result.
8. Analysis history and report details are stored in MySQL.
EEG Processing Details
The current implementation uses the following processing approach:
- Filtering: Band-pass filter from 0.5 Hz to 45 Hz.
- Referencing: Average reference.
- Windowing: 5-second windows with 50% overlap.
- Wavelet features: Discrete Wavelet Transform (DWT), using the db4 wavelet at level 5.
- Statistical features: Mean, standard deviation, variance, entropy, skewness, and kurtosis.
- Frequency-domain features: Welch power spectral density and relative power in delta, theta, alpha, beta, and gamma bands.
- Classifier: Support Vector Machine (SVM) with an RBF kernel.
The model artifacts used by the current project are:
- svm_seizure_model_5sec.pkl
- scaler_5sec.pkl
- feature_columns_5sec.pkl
- training_medians_5sec.pkl
Keep these files in the location expected by the backend code. Do not rename or move them unless you also update the corresponding code.
Dataset
The project is designed around EEG recordings from the CHB-MIT Scalp EEG Database, which contains EEG recordings in EDF format.
Official dataset page: https://physionet.org/content/chbmit/
Follow the dataset's terms and citation requirements. Do not commit large EEG files to Git. Place the required EDF files in the dataset location configured in your project.
Prerequisites
- Python compatible with the backend dependencies
- Node.js and npm
- MySQL Server
- Git (optional)
Use the versions specified in your project's dependency files where available.
Project Structure
The exact structure may vary, but the main folders should be similar to:
Silent_Seizure_Detection/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database/
│   │   ├── models/
│   │   ├── routers/
│   │   └── services/
│   ├── venv/                     # Local virtual environment; do not commit
│   └── requirements.txt          # If present
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── Dataset/                      # Local EEG data; do not commit large files
└── README.md
Setup and Installation
1. Open or clone the project
If the project is hosted in a Git repository:
git clone <your-repository-url>
cd Silent_Seizure_Detection
Otherwise, open your existing project folder.
2. Configure MySQL
1. Start MySQL Server.
2. Create the database:
CREATE DATABASE silent_seizure_db;
3. Configure the database connection using the settings expected by your backend.
4. Ensure the required tables exist. The project uses tables for administrators, doctors/clinicians, patients, doctor-patient associations, EEG analyses, and reports.
Security: Keep database usernames and passwords in environment variables or a local configuration file excluded from Git. Never commit real credentials.
3. Set up and run the backend
From the project root, run:
cd backend
python -m venv venv
Activate the virtual environment on Windows Command Prompt:
venv\Scripts\activate.bat
Or in PowerShell:
.\venv\Scripts\Activate.ps1
Install dependencies using the project's requirements file, if available:
pip install -r requirements.txt
If there is no requirements.txt, install the dependencies listed in your backend imports and project configuration using compatible versions.
Start FastAPI from the backend directory:
python -m uvicorn app.main:app --reload
- Backend base URL: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs
4. Set up and run the frontend
Open a second terminal:
cd frontend
npm install
npm run dev
If PowerShell blocks npm.ps1, use:
npm.cmd install
npm.cmd run dev
Open the local frontend URL printed by Vite. In the current setup, it is usually:
http://localhost:5173/
5. Verify the application
- Confirm that MySQL is running and the database connection works.
- Confirm that the backend starts and /docs opens.
- Confirm that the frontend can communicate with the backend.
- Sign in with a configured account.
- Test with an appropriate EDF file and verify that the result and analysis history are displayed.
- Generate a report and confirm that it can be downloaded.
Model Evaluation
An earlier recorded evaluation of the model reported these values:
Metric	Recorded value
Accuracy	98.75%
Precision	81.82%
Recall	69.23%
F1-score	75.00%


These metrics depend on the dataset, labels, preprocessing, and evaluation split. Verify them against the final model before using them in a report or presentation. Accuracy alone may not adequately describe seizure-detection performance, especially when seizure examples are less common than non-seizure examples.
Repository Hygiene
Before pushing the project to a public or shared repository:
- Do not commit passwords, API keys, or database credentials.
- Do not commit venv/ or node_modules/.
- Avoid committing large EEG recordings or patient-identifiable data.
- Check whether trained model files may be shared under the dataset and project terms.
- Add local environment files and generated outputs to .gitignore.
- Use synthetic or de-identified sample records for demonstrations.
Example .gitignore entries (adjust to your project):
__pycache__/
*.py[cod]
venv/
.env
node_modules/
dist/
Dataset/
*.edf
reports_generated/
Limitations and Future Enhancements
- Prediction quality depends on training data, preprocessing, and model generalization.
- EEG artifacts and differences between patients or recording equipment can affect results.
- The classifier should be independently validated on suitable unseen data before any real-world clinical use.
- Future work may include broader validation, improved seizure-event detection, explainability, and integration with clinical workflows after appropriate safety and privacy review.
Acknowledgements
- CHB-MIT Scalp EEG Database, hosted by PhysioNet.
- The open-source Python, EEG-processing, machine-learning, frontend, and backend communities.
Author
Project: Silent Seizure Detection System Using Machine Learning and EEG Signals
Institution: Muthoot Institute of Technology and Science (MITS), Kochi
Degree: Master of Computer Applications (MCA)
