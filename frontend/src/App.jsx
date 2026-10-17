import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

// =====================================================
// AUTH SESSION HELPERS
// =====================================================
// Login data is stored only for the current browser tab/session.
// Refreshing the page keeps the login, while closing the tab/browser
// normally clears the session.
function clearAuthSession() {
  sessionStorage.removeItem("doctor");
  sessionStorage.removeItem("admin");
}

// Remove old persistent login values from previous versions.
// This runs once when the app bundle is loaded and prevents an old
// localStorage session from making the user appear logged in.
try {
  localStorage.removeItem("doctor");
  localStorage.removeItem("admin");
} catch (error) {
  console.warn("Unable to clear legacy login storage.", error);
}

// =====================================================
// DOCTOR DASHBOARD
// =====================================================
// =====================================================
// MY PATIENTS PAGE
// =====================================================

function MyPatients({
  doctor,
  onBack,
  onViewPatient,
  onNavigate,
  onLogout
}) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    contact: "",
    address: ""
  });

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError("");

      if (!doctor || !doctor.doctor_id) {
        throw new Error("Doctor information is not available.");
      }

      const response = await fetch(
        `${API_URL}/doctor-patients/${doctor.doctor_id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load patients."
        );
      }

      setPatients(data.patients || []);

    } catch (error) {
      console.error("Load patients error:", error);
      setError(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctor?.doctor_id) {
      loadPatients();
    }
  }, [doctor?.doctor_id]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setFormError("");
  };

  const handleAddPatient = () => {
    setEditingPatient(null);

    setFormData({
      name: "",
      age: "",
      gender: "",
      contact: "",
      address: ""
    });

    setFormError("");
    setShowForm(true);
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);

    setFormData({
      name: patient.name || "",
      age: patient.age || "",
      gender: patient.gender || "",
      contact: patient.contact || "",
      address: patient.address || ""
    });

    setFormError("");
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPatient(null);

    setFormData({
      name: "",
      age: "",
      gender: "",
      contact: "",
      address: ""
    });

    setFormError("");
  };

  const validateForm = () => {
    const name = formData.name.trim();
    const age = Number(formData.age);
    const contact = formData.contact.trim();
    const address = formData.address.trim();

    if (!name) {
      setFormError("Patient name is required.");
      return false;
    }

    if (!formData.age) {
      setFormError("Patient age is required.");
      return false;
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setFormError(
        "Please enter a valid age between 1 and 120."
      );
      return false;
    }

    if (!formData.gender) {
      setFormError("Please select gender.");
      return false;
    }

    if (!contact) {
      setFormError("Contact number is required.");
      return false;
    }

    if (!address) {
      setFormError("Address is required.");
      return false;
    }

    return true;
  };

  const handleSavePatient = async (event) => {
    event.preventDefault();

    setFormError("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      let response;

      if (editingPatient) {
        response = await fetch(
          `${API_URL}/patients/${editingPatient.patient_id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: formData.name.trim(),
              age: Number(formData.age),
              gender: formData.gender,
              contact: formData.contact.trim(),
              address: formData.address.trim()
            })
          }
        );
      } else {
        if (!doctor || !doctor.doctor_id) {
          throw new Error(
            "Doctor information is not available."
          );
        }

        response = await fetch(
          `${API_URL}/doctor-patients/add`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              doctor_id: doctor.doctor_id,
              name: formData.name.trim(),
              age: Number(formData.age),
              gender: formData.gender,
              contact: formData.contact.trim(),
              address: formData.address.trim()
            })
          }
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to save patient."
        );
      }

      window.alert(
        editingPatient
          ? "Patient updated successfully."
          : "Patient added successfully."
      );

      handleCancelForm();

      await loadPatients();

    } catch (error) {
      console.error("Save patient error:", error);

      setFormError(
        error.message || "Unable to save patient."
      );

    } finally {
      setSaving(false);
    }
  };

  const handleDeletePatient = async (patient) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${patient.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/patients/${patient.patient_id}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to delete patient."
        );
      }

      window.alert("Patient deleted successfully.");

      await loadPatients();

    } catch (error) {
      console.error("Delete patient error:", error);

      window.alert(
        error.message || "Unable to delete patient."
      );
    }
  };

  return (
    <div className="dashboard-page">

      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">

          <div className="dashboard-logo">
            EEG
          </div>

          <div>
            <h2>Silent Seizure</h2>
            <p>Detection System</p>
          </div>

        </div>

        <nav className="dashboard-nav">

          <button
            className="nav-item"
            onClick={onBack}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button className="nav-item active">
            <span>♙</span>
            Manage Patients
          </button>

          <button
            className="nav-item"
            onClick={() => onNavigate("analysis")}
          >
            <span>≋</span>
            EEG Analysis
          </button>

          <button
            className="nav-item"
            onClick={() => onNavigate("history")}
          >
            <span>◷</span>
            Analysis History
          </button>

          <button
            className="nav-item"
            onClick={() => onNavigate("reports")}
          >
            <span>▣</span>
            Reports
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="clinical-note">
            <strong>
              Clinical Decision Support
            </strong>

            <p>
              For authorized healthcare professionals only.
            </p>
          </div>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            <span>↪</span>
            Logout
          </button>

        </div>

      </aside>

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <p className="dashboard-overline">
              DOCTOR / CLINICIAN PORTAL
            </p>

            <h1>
              Manage Patients
            </h1>

            

          </div>

          <div className="doctor-profile">

            <div className="doctor-avatar">
              {doctor?.name
                ? doctor.name.charAt(0).toUpperCase()
                : "D"}
            </div>

            <div>

              <strong>
                {doctor?.name || "Doctor"}
              </strong>

              <span>
                Healthcare Professional
              </span>

            </div>

          </div>

        </header>

        <section className="dashboard-stats">

          <div className="stat-card">

            <div className="stat-icon">
              ♙
            </div>

            <div>

              <span>
                Total Patients
              </span>

              <strong>
                {loading ? "—" : patients.length}
              </strong>

            </div>

          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flex: 1
            }}
          >

            <button
              className="analyse-button"
              onClick={handleAddPatient}
              style={{
                maxWidth: "220px"
              }}
            >
              + Add Patient
            </button>

          </div>

        </section>

        {showForm && (

          <section className="dashboard-section">

            <div className="section-heading">

              <div>

                <h2>
                  {editingPatient
                    ? "Edit Patient"
                    : "Add New Patient"}
                </h2>

                <p>
                  {editingPatient
                    ? "Update patient information."
                    : "Enter patient information and assign the patient to your account."}
                </p>

              </div>

            </div>

            <div className="patients-card">

              <form
                onSubmit={handleSavePatient}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "20px",
                  padding: "25px"
                }}
              >

                <div className="analysis-form-group">

                  <label>
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter patient name"
                    autoComplete="off"
                  />

                </div>

                <div className="analysis-form-group">

                  <label>
                    Age
                  </label>

                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Enter age"
                    min="1"
                    max="120"
                  />

                </div>

                <div className="analysis-form-group">

                  <label>
                    Gender
                  </label>

                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                  >

                    <option value="">
                      -- Select Gender --
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </div>

                <div className="analysis-form-group">

                  <label>
                    Contact
                  </label>

                  <input
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    placeholder="Enter contact number"
                    autoComplete="off"
                  />

                </div>

                <div
                  className="analysis-form-group"
                  style={{
                    gridColumn: "1 / -1"
                  }}
                >

                  <label>
                    Address
                  </label>

                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter patient address"
                    rows="3"
                  />

                </div>

                {formError && (

                  <div
                    className="analysis-error"
                    style={{
                      gridColumn: "1 / -1"
                    }}
                  >
                    {formError}
                  </div>

                )}

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end"
                  }}
                >

                  <button
                    type="button"
                    className="view-all-button"
                    onClick={handleCancelForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="analyse-button"
                    disabled={saving}
                    style={{
                      maxWidth: "180px"
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : editingPatient
                        ? "Update Patient"
                        : "Add Patient"}
                  </button>

                </div>

              </form>

            </div>

          </section>

        )}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <h2>
                Assigned Patients
              </h2>

              <p>
                Patients currently assigned to you.
              </p>

            </div>

          </div>

          <div className="patients-card">

            {loading ? (

              <div className="empty-state">
                Loading patients...
              </div>

            ) : error ? (

              <div className="error-dashboard">

                {error}

                <br />

                <button
                  className="view-all-button"
                  onClick={loadPatients}
                  style={{
                    marginTop: "12px"
                  }}
                >
                  Try Again
                </button>

              </div>

            ) : patients.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  ♙
                </div>

                <h3>
                  No patients assigned
                </h3>

                <p>
                  Click "+ Add Patient" to add your first patient.
                </p>

                <button
                  className="analyse-button"
                  onClick={handleAddPatient}
                  style={{
                    marginTop: "15px",
                    maxWidth: "180px"
                  }}
                >
                  + Add Patient
                </button>

              </div>

            ) : (

              <div className="patients-table-wrapper">

                <table className="patients-table">

                  <thead>

                    <tr>

                      <th>Patient</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Contact</th>
                      <th>Address</th>
                      <th>Actions</th>

                    </tr>

                  </thead>

                  <tbody>

                    {patients.map((patient) => (

                      <tr
                        key={patient.patient_id}
                      >

                        <td>

                          <div className="patient-name">

                            <div className="patient-avatar">

                              {patient.name
                                ? patient.name.charAt(0).toUpperCase()
                                : "P"}

                            </div>

                            <div>

                              <strong>
                                {patient.name}
                              </strong>

                              <span>
                                Patient ID: P
                                {String(
                                  patient.patient_id
                                ).padStart(3, "0")}
                              </span>

                            </div>

                          </div>

                        </td>

                        <td>
                          {patient.age || "—"}
                        </td>

                        <td>
                          {patient.gender || "—"}
                        </td>

                        <td>
                          {patient.contact || "—"}
                        </td>

                        <td>
                          {patient.address || "—"}
                        </td>

                        <td>

                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap"
                            }}
                          >

                            <button
                              className="patient-action"
                              onClick={() =>
                                onViewPatient(patient)
                              }
                            >
                              View
                            </button>

                            <button
                              className="patient-action"
                              onClick={() =>
                                handleEditPatient(patient)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="patient-action"
                              onClick={() =>
                                handleDeletePatient(patient)
                              }
                              style={{
                                borderColor: "#dc2626",
                                color: "#dc2626"
                              }}
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>

        <button
          className="view-all-button"
          onClick={onBack}
          style={{
            marginTop: "10px",
            fontSize: "14px"
          }}
        >
          ← Back to Dashboard
        </button>

        <footer className="dashboard-footer">

          <span>
            © 2026 Silent Seizure Detection System
          </span>

          <span>
            Clinical Decision Support • Authorized Use Only
          </span>

        </footer>

      </main>

    </div>
  );
}
// =====================================================
// PATIENT DETAILS PAGE
// =====================================================

function PatientDetails({ doctor, patient, onBack, onNavigate, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${API_URL}/history/patient/${patient.patient_id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load analysis history."
          );
        }

        // The backend may return an array directly
        // or an object containing the history.
        if (Array.isArray(data)) {
          setHistory(data);
        } else if (Array.isArray(data.history)) {
          setHistory(data.history);
        } else if (Array.isArray(data.analyses)) {
          setHistory(data.analyses);
        } else {
          setHistory([]);
        }
      } catch (error) {
        console.error(error);

        setHistoryError(
          error.message ||
            "Unable to load analysis history."
        );
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [patient.patient_id]);

  return (
    <div className="dashboard-page">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">

          <div className="dashboard-logo">
            EEG
          </div>

          <div>
            <h2>Silent Seizure</h2>
            <p>Detection System</p>
          </div>

        </div>


        <nav className="dashboard-nav">

          <button
            className="nav-item"
            onClick={onBack}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className="nav-item active"
          >
            <span>♙</span>
            My Patients
          </button>

          <button className="nav-item" onClick={() => onNavigate("analysis")}>
            <span>≋</span>
            EEG Analysis
          </button>

          <button className="nav-item" onClick={() => onNavigate("history")}>
            <span>◷</span>
            Analysis History
          </button>

          <button className="nav-item" onClick={() => onNavigate("reports")}>
            <span>▣</span>
            Reports
          </button>

        </nav>


        <div className="sidebar-bottom">

          <div className="clinical-note">

            <strong>
              Clinical Decision Support
            </strong>

            <p>
              For authorized healthcare
              professionals only.
            </p>

          </div>


          <button
            className="logout-button"
            onClick={onLogout}
          >
            <span>↪</span>
            Logout
          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <p className="dashboard-overline">
              DOCTOR / CLINICIAN PORTAL
            </p>

            <h1>
              Patient Details
            </h1>

            <p>
              View patient information and previous EEG analyses.
            </p>

          </div>


          <div className="doctor-profile">

            <div className="doctor-avatar">
              {doctor.name
                ? doctor.name.charAt(0).toUpperCase()
                : "D"}
            </div>

            <div>

              <strong>
                {doctor.name}
              </strong>

              <span>
                Healthcare Professional
              </span>

            </div>

          </div>

        </header>


        {/* =====================================================
            PATIENT INFORMATION
        ===================================================== */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <h2>
                Patient Information
              </h2>

              <p>
                Personal information of the selected patient.
              </p>

            </div>

          </div>


          <div className="patient-details-card">

            <div className="patient-details-header">

              <div className="large-patient-avatar">
                {patient.name
                  ? patient.name.charAt(0).toUpperCase()
                  : "P"}
              </div>

              <div>

                <h2>
                  {patient.name}
                </h2>

                <p>
                  Patient ID: P
                  {String(patient.patient_id).padStart(3, "0")}
                </p>

              </div>

            </div>


            <div className="patient-details-grid">

              <div className="detail-item">
                <span>Patient ID</span>
                <strong>
                  P
                  {String(patient.patient_id).padStart(3, "0")}
                </strong>
              </div>


              <div className="detail-item">
                <span>Full Name</span>
                <strong>
                  {patient.name || "—"}
                </strong>
              </div>


              <div className="detail-item">
                <span>Age</span>
                <strong>
                  {patient.age || "—"}
                </strong>
              </div>


              <div className="detail-item">
                <span>Gender</span>
                <strong>
                  {patient.gender || "—"}
                </strong>
              </div>


              <div className="detail-item">
                <span>Contact</span>
                <strong>
                  {patient.contact || "—"}
                </strong>
              </div>


              <div className="detail-item">
                <span>Address</span>
                <strong>
                  {patient.address || "—"}
                </strong>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            ANALYSIS SUMMARY
        ===================================================== */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <h2>
                EEG Analysis History
              </h2>

              <p>
                Previous EEG analyses associated with this patient.
              </p>

            </div>

          </div>


          <div className="patients-card">

            {loadingHistory ? (

              <div className="empty-state">
                Loading analysis history...
              </div>

            ) : historyError ? (

              <div className="error-dashboard">
                {historyError}
              </div>

            ) : history.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  ≋
                </div>

                <h3>
                  No previous analyses
                </h3>

                <p>
                  EEG analyses for this patient will appear here.
                </p>

              </div>

            ) : (

              <div className="patients-table-wrapper">

                <table className="patients-table">

                  <thead>

                    <tr>

                      <th>
                        Analysis ID
                      </th>

                      <th>
                        EEG File
                      </th>

                      <th>
                        Model
                      </th>

                      <th>
                        Prediction
                      </th>

                      <th>
                        Probability
                      </th>

                      <th>
                        Date
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {history.map((analysis, index) => (

                      <tr
                        key={
                          analysis.analysis_id ||
                          index
                        }
                      >

                        <td>
                          {analysis.analysis_id
                            ? `A${analysis.analysis_id}`
                            : `A${index + 1}`}
                        </td>


                        <td>
                          {analysis.eeg_file ||
                            analysis.filename ||
                            "—"}
                        </td>


                        <td>
                          {analysis.model_used ||
                            "SVM"}
                        </td>


                        <td>
                          {analysis.prediction ||
                            "—"}
                        </td>


                        <td>
                          {analysis.seizure_probability !==
                          undefined
                            ? `${(
                                Number(
                                  analysis.seizure_probability
                                ) * 100
                              ).toFixed(2)}%`
                            : "—"}
                        </td>


                        <td>
                          {analysis.analysis_date
                            ? new Date(
                                analysis.analysis_date
                              ).toLocaleString()
                            : "—"}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>


        {/* =====================================================
            BACK BUTTON
        ===================================================== */}

        <button
          className="view-all-button"
          onClick={onBack}
          style={{
            marginTop: "10px",
            fontSize: "14px"
          }}
        >
          ← Back to My Patients
        </button>


        <footer className="dashboard-footer">

          <span>
            © 2026 Silent Seizure Detection System
          </span>

          <span>
            Clinical Decision Support • Authorized Use Only
          </span>

        </footer>

      </main>

    </div>
  );
}
// =====================================================
// EEG ANALYSIS PAGE
// =====================================================

function EEGAnalysis({ doctor, onBack, onNavigate, onLogout }) {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [error, setError] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [result, setResult] = useState(null);


  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await fetch(
          `${API_URL}/doctor-patients/${doctor.doctor_id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load patients."
          );
        }

        setPatients(data.patients || []);
      } catch (error) {
        console.error(error);

        setError(
          error.message ||
            "Unable to connect to the server."
        );
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, [doctor.doctor_id]);
  const handleAnalyse = async () => {
    setAnalysisError("");
    setResult(null);

    if (!selectedPatient) {
      setAnalysisError("Please select a patient.");
      return;
    }

    if (!selectedFile) {
      setAnalysisError("Please select an EDF file.");
      return;
    }

    setAnalysing(true);

    try {
      const formData = new FormData();

      formData.append("patient_id", selectedPatient);
      formData.append("file", selectedFile);

      const response = await fetch(
        `${API_URL}/prediction/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "EEG analysis failed."
        );
      }

      console.log("EEG Analysis Result:", data);

      setResult(data);

    } catch (error) {
      console.error(error);

      setAnalysisError(
        error.message ||
          "Unable to analyse the EEG file."
      );

    } finally {
      setAnalysing(false);
    }
  };
const handleGenerateReport = async () => {
  if (!result?.analysis_id) {
    setAnalysisError("Analysis ID is missing.");
    return;
  }

  try {
    setAnalysisError("");

    const response = await fetch(
      `${API_URL}/reports/generate/${result.analysis_id}`,
      {
        method: "POST",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to generate report.");
    }

    console.log("Report generated:", data);

    const reportId = data.report_id;

    if (!reportId) {
      throw new Error("Report ID was not returned by the server.");
    }

    const downloadResponse = await fetch(
      `${API_URL}/reports/download/${reportId}`
    );

    if (!downloadResponse.ok) {
      throw new Error("Failed to download the report.");
    }

    const blob = await downloadResponse.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `EEG_Report_${result.file || "analysis"}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    setAnalysisError(
      error.message || "Unable to generate the report."
    );
  }
};
  return (
    <div className="dashboard-page">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">

          <div className="dashboard-logo">
            EEG
          </div>

          <div>
            <h2>Silent Seizure</h2>
            <p>Detection System</p>
          </div>

        </div>


        <nav className="dashboard-nav">

          <button
            className="nav-item"
            onClick={() => onNavigate("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>


          <button
            className="nav-item"
            onClick={() => onNavigate("patients")}
          >
            <span>♙</span>
            My Patients
          </button>


          <button
            className="nav-item active"
          >
            <span>≋</span>
            EEG Analysis
          </button>


          <button className="nav-item" onClick={() => onNavigate("history")}>
            <span>◷</span>
            Analysis History
          </button>


          <button className="nav-item" onClick={() => onNavigate("reports")}>
            <span>▣</span>
            Reports
          </button>

        </nav>


        <div className="sidebar-bottom">

          <div className="clinical-note">

            <strong>
              Clinical Decision Support
            </strong>

            <p>
              For authorized healthcare
              professionals only.
            </p>

          </div>


          <button
            className="logout-button"
            onClick={onLogout}
          >
            <span>↪</span>
            Logout
          </button>

        </div>

      </aside>
      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <p className="dashboard-overline">
              DOCTOR / CLINICIAN PORTAL
            </p>

            <h1>
              EEG Analysis
            </h1>

            

          </div>


          <div className="doctor-profile">

            <div className="doctor-avatar">
              {doctor.name
                ? doctor.name.charAt(0).toUpperCase()
                : "D"}
            </div>

            <div>

              <strong>
                {doctor.name}
              </strong>

              <span>
                Healthcare Professional
              </span>

            </div>

          </div>

        </header>


        {/* =====================================================
            ANALYSIS FORM
        ===================================================== */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <h2>
                New EEG Analysis
              </h2>

              <p>
                Select a patient and upload their EEG recording.
              </p>

            </div>

          </div>


          <div className="eeg-analysis-card">

            {/* PATIENT */}

            <div className="analysis-form-group">

              <label htmlFor="patient">
                Select Patient
              </label>

              {loadingPatients ? (

                <div className="analysis-loading">
                  Loading patients...
                </div>

              ) : error ? (

                <div className="error-dashboard">
                  {error}
                </div>

              ) : (

                <select
                  id="patient"
                  value={selectedPatient}
                  onChange={(event) =>
                    setSelectedPatient(event.target.value)
                  }
                >

                  <option value="">
                    -- Select Patient --
                  </option>

                  {patients.map((patient) => (

                    <option
                      key={patient.patient_id}
                      value={patient.patient_id}
                    >

                      {patient.name} — P
                      {String(
                        patient.patient_id
                      ).padStart(3, "0")}

                    </option>

                  ))}

                </select>

              )}

            </div>


            {/* FILE UPLOAD */}

            <div className="analysis-form-group">

              <label>
                EEG Recording
              </label>

              <div className="upload-box">

                <div className="upload-icon">
                  ↑
                </div>

                <h3>
                  Upload EEG Recording
                </h3>

                <p>
                  Select an EDF (.edf) EEG file for analysis.
                </p>

                <input
  type="file"
  accept=".edf"
  id="eeg-file"
  onChange={(event) => {
    const file = event.target.files[0];
    setSelectedFile(file || null);
    setAnalysisError("");
    setResult(null);
  }}
/>

              </div>

            </div>


            


            {/* ANALYSE BUTTON */}

            <button
  className="analyse-button"
  onClick={handleAnalyse}
  disabled={
    !selectedPatient ||
    !selectedFile ||
    analysing
  }
>
  {analysing ? "Analysing EEG..." : "Analyse EEG"}
</button>

{analysisError && (
  <div className="analysis-error">
    {analysisError}
  </div>
)}

{result && (
  <div className="analysis-result-card">
    <div className="result-header">
      <div>
        <p className="dashboard-overline">
          ANALYSIS COMPLETE
        </p>
        <h2>EEG Analysis Result</h2>
      </div>
    </div>

    <div className="result-grid">

      <div className="result-item">
        <span>Patient ID</span>
        <strong>
          P{String(selectedPatient).padStart(3, "0")}
        </strong>
      </div>

      <div className="result-item">
        <span>EEG File</span>
        <strong>{result.file || "—"}</strong>
      </div>

      <div className="result-item">
        <span>Model</span>
        <strong>SVM</strong>
      </div>

      <div className="result-item">
        <span>Prediction</span>
        <strong>{result.prediction || "—"}</strong>
      </div>

      <div className="result-item">
        <span>Seizure Probability</span>
        <strong>
          {result.seizure_probability !== undefined
            ? `${(
                Number(result.seizure_probability) * 100
              ).toFixed(2)}%`
            : "—"}
        </strong>
      </div>

      <div className="result-item">
        <span>Total Segments</span>
        <strong>{result.total_segments || "—"}</strong>
      </div>

      
<div className="result-item">
  <span>Seizure Segments</span>
  <strong>
    {result.raw_seizure_segments ?? "—"}
  </strong>
</div>

<div className="result-item">
  <span>Non-Seizure Segments</span>
  <strong>
    {result.raw_non_seizure_segments ?? "—"}
  </strong>
</div>


    </div>

    <div className="analysis-disclaimer">
      <strong>Clinical Decision Support</strong>
      <p>
        This result is generated using the trained SVM
        machine learning model. It is intended to assist
        authorized healthcare professionals and should not
        replace clinical judgment.
      </p>
    </div> 

    <div className="report-actions">
  <button
  className="report-button"
  onClick={handleGenerateReport}
> 
  Generate Report
</button>
  </div>
  </div>
)}   
<div className="seizure-timeline">
  <div className="result-header">
    <p className="dashboard-overline">
      SEIZURE DETECTION WINDOWS
    </p>
    <h3>Detected Seizure Segments</h3>
  </div>  
  {result?.results
  ?.filter((segment) => segment.prediction === 1)
    .map((segment, index) => (
      <div className="seizure-row" key={index}>
        <div> 
          <strong>
            Segment {segment.segment}
          </strong>

          <span>
            {segment.start_time}s – {segment.end_time}s
          </span>
        </div>

        <strong>
          {(Number(segment.seizure_probability) * 100).toFixed(2)}%
        </strong>
      </div>
    ))}  
</div>
            {/* INFORMATION */}

            <div className="analysis-disclaimer">

              <strong>
                Clinical Decision Support
              </strong>

              <p>
                This system provides machine-learning-based
                analysis to assist authorized healthcare
                professionals. Results should be reviewed by
                a qualified professional and are not intended
                to replace clinical judgment.
              </p>

            </div>

          </div>

        </section>   
        {/* BACK */}
        <button
          className="view-all-button"
          onClick={onBack}
          style={{
            marginTop: "10px",
            fontSize: "14px"
          }}
        >
          ← Back to Dashboard
        </button>


        <footer className="dashboard-footer">

          <span>
            © 2026 Silent Seizure Detection System
          </span>

          <span>
            Clinical Decision Support • Authorized Use Only
          </span>

        </footer>

      </main>

    </div>
  );
}

// =====================================================
// ANALYSIS HISTORY PAGE
// =====================================================
function AnalysisHistory({ doctor, onNavigate, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(
          `${API_URL}/history/patient/all/${doctor.doctor_id}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load analysis history.");
        }

        setHistory(
          Array.isArray(data) ? data : data.history || data.analyses || []
        );
      } catch (error) {
        console.error(error);
        setError(error.message || "Unable to load analysis history.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [doctor.doctor_id]);

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-logo">EEG</div>
          <div>
            <h2>Silent Seizure</h2>
            <p>Detection System</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <button className="nav-item" onClick={() => onNavigate("dashboard")}>
            <span>⌂</span> Dashboard
          </button>
          <button className="nav-item" onClick={() => onNavigate("patients")}>
            <span>♙</span> My Patients
          </button>
          <button className="nav-item" onClick={() => onNavigate("analysis")}>
            <span>≋</span> EEG Analysis
          </button>
          <button className="nav-item active">
            <span>◷</span> Analysis History
          </button>
          <button className="nav-item" onClick={() => onNavigate("reports")}>
            <span>▣</span> Reports
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="clinical-note">
            <strong>Clinical Decision Support</strong>
            <p>For authorized healthcare professionals only.</p>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <span>↪</span> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-overline">DOCTOR / CLINICIAN PORTAL</p>
            <h1>Analysis History</h1>
            <p>Review previous EEG analyses performed for your patients.</p>
          </div>
          <div className="doctor-profile">
            <div className="doctor-avatar">
              {doctor.name ? doctor.name.charAt(0).toUpperCase() : "D"}
            </div>
            <div>
              <strong>{doctor.name}</strong>
              <span>Healthcare Professional</span>
            </div>
          </div>
        </header>

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Previous EEG Analyses</h2>
              <p>Analysis records stored in the system.</p>
            </div>
          </div>

          <div className="patients-card">
            {loading ? (
              <div className="empty-state">Loading analysis history...</div>
            ) : error ? (
              <div className="error-dashboard">{error}</div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◷</div>
                <h3>No previous analyses</h3>
                <p>Completed EEG analyses will appear here.</p>
              </div>
            ) : (
              <div className="patients-table-wrapper">
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th>Analysis ID</th>
                      <th>Patient</th>
                      <th>EEG File</th>
                      <th>Model</th>
                      <th>Prediction</th>
                      <th>Probability</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((analysis, index) => (
                      <tr key={analysis.analysis_id || index}>
                        <td>{analysis.analysis_id ? `A${analysis.analysis_id}` : `A${index + 1}`}</td>
                        <td>{analysis.patient_name || `P${String(analysis.patient_id || "").padStart(3, "0")}`}</td>
                        <td>{analysis.eeg_file || analysis.filename || "—"}</td>
                        <td>{analysis.model_used || "SVM"}</td>
                        <td>{analysis.prediction || "—"}</td>
                        <td>
                          {analysis.seizure_probability !== undefined
                            ? `${(Number(analysis.seizure_probability) * 100).toFixed(2)}%`
                            : "—"}
                        </td>
                        <td>
                          {analysis.analysis_date
                            ? new Date(analysis.analysis_date).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>© 2026 Silent Seizure Detection System</span>
          <span>Clinical Decision Support • Authorized Use Only</span>
        </footer>
      </main>
    </div>
  );
}

// =====================================================
// REPORTS PAGE
// =====================================================
function Reports({ doctor, onNavigate, onLogout }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch(
          `${API_URL}/history/patient/all/${doctor.doctor_id}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to load reports.");
        }
        setHistory(Array.isArray(data) ? data : data.history || data.analyses || []);
      } catch (error) {
        console.error(error);
        setError(error.message || "Unable to load reports.");
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [doctor.doctor_id]);

  const handleDownloadReport = async (analysisId) => {
    try {
      setDownloading(analysisId);
      setError("");

      const generateResponse = await fetch(
        `${API_URL}/reports/generate/${analysisId}`,
        { method: "POST" }
      );
      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generateData.detail || "Failed to generate report.");
      }

      const downloadResponse = await fetch(
        `${API_URL}/reports/download/${generateData.report_id}`
      );

      if (!downloadResponse.ok) {
        throw new Error("Failed to download the report.");
      }

      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `EEG_Report_A${analysisId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setError(error.message || "Unable to download the report.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-logo">EEG</div>
          <div>
            <h2>Silent Seizure</h2>
            <p>Detection System</p>
          </div>
        </div>
        <nav className="dashboard-nav">
          <button className="nav-item" onClick={() => onNavigate("dashboard")}><span>⌂</span> Dashboard</button>
          <button className="nav-item" onClick={() => onNavigate("patients")}><span>♙</span> My Patients</button>
          <button className="nav-item" onClick={() => onNavigate("analysis")}><span>≋</span> EEG Analysis</button>
          <button className="nav-item" onClick={() => onNavigate("history")}><span>◷</span> Analysis History</button>
          <button className="nav-item active"><span>▣</span> Reports</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="clinical-note">
            <strong>Clinical Decision Support</strong>
            <p>For authorized healthcare professionals only.</p>
          </div>
          <button className="logout-button" onClick={onLogout}><span>↪</span> Logout</button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-overline">DOCTOR / CLINICIAN PORTAL</p>
            <h1>Reports</h1>
           
          </div>
          <div className="doctor-profile">
            <div className="doctor-avatar">{doctor.name ? doctor.name.charAt(0).toUpperCase() : "D"}</div>
            <div><strong>{doctor.name}</strong><span>Healthcare Professional</span></div>
          </div>
        </header>

        <section className="dashboard-section">
          <div className="section-heading">
            <div><h2>Generated Reports</h2></div>
          </div>
          <div className="patients-card">
            {loading ? (
              <div className="empty-state">Loading reports...</div>
            ) : error ? (
              <div className="error-dashboard">{error}</div>
            ) : history.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">▣</div><h3>No reports available</h3><p>Completed EEG analyses will appear here.</p></div>
            ) : (
              <div className="patients-table-wrapper">
                <table className="patients-table">
                  <thead><tr><th>Analysis ID</th><th>Patient</th><th>EEG File</th><th>Prediction</th><th>Date</th><th>Report</th></tr></thead>
                  <tbody>
                    {history.map((analysis) => (
                      <tr key={analysis.analysis_id}>
                        <td>{`A${analysis.analysis_id}`}</td>
                        <td>{analysis.patient_name || `P${String(analysis.patient_id).padStart(3, "0")}`}</td>
                        <td>{analysis.eeg_file || "—"}</td>
                        <td>{analysis.prediction || "—"}</td>
                        <td>{analysis.analysis_date ? new Date(analysis.analysis_date).toLocaleString() : "—"}</td>
                        <td>
                          <button className="report-button" onClick={() => handleDownloadReport(analysis.analysis_id)} disabled={downloading === analysis.analysis_id}>
                            {downloading === analysis.analysis_id ? "Preparing..." : "Download"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>© 2026 Silent Seizure Detection System</span>
          <span>Clinical Decision Support • Authorized Use Only</span>
        </footer>
      </main>
    </div>
  );
}

function Dashboard({
  doctor,
  onLogout,
  onNavigate,
  onViewPatient
}) {
  // =====================================================
  // DASHBOARD STATE
  // =====================================================

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [analysisCount, setAnalysisCount] = useState(0);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);

  const [error, setError] = useState("");


  // =====================================================
  // LOAD PATIENTS
  // =====================================================

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoadingPatients(true);
        setError("");

        const response = await fetch(
          `${API_URL}/doctor-patients/${doctor.doctor_id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
            "Unable to load patients."
          );
        }

        setPatients(
          data.patients || []
        );

      } catch (error) {
        console.error(
          "Unable to load patients:",
          error
        );

        setError(
          error.message ||
          "Unable to connect to the server."
        );

      } finally {
        setLoadingPatients(false);
      }
    };


    if (doctor?.doctor_id) {
      loadPatients();
    }

  }, [doctor?.doctor_id]);


  // =====================================================
  // LOAD EEG ANALYSIS COUNT
  // =====================================================

  useEffect(() => {

    const loadAnalysisCount = async () => {

      try {

        setLoadingAnalyses(true);

        /*
         * Get all EEG analyses belonging to this doctor.
         *
         * Backend endpoint:
         *
         * GET /history/patient/all/{doctor_id}
         */

        const response = await fetch(
          `${API_URL}/history/patient/all/${doctor.doctor_id}`
        );


        const data = await response.json();


        if (!response.ok) {

          throw new Error(
            data.detail ||
            "Unable to load EEG analysis history."
          );

        }


        // =================================================
        // HANDLE ALL POSSIBLE BACKEND RESPONSE FORMATS
        // =================================================

        let analyses = [];


        // Backend returns:
        //
        // [
        //   {
        //      analysis_id: 8,
        //      patient_id: 11,
        //      ...
        //   }
        // ]

        if (Array.isArray(data)) {

          analyses = data;

        }


        // Backend may return:
        //
        // {
        //     "analyses": [...]
        // }

        else if (
          Array.isArray(data.analyses)
        ) {

          analyses = data.analyses;

        }


        // Backend may return:
        //
        // {
        //     "history": [...]
        // }

        else if (
          Array.isArray(data.history)
        ) {

          analyses = data.history;

        }


        // Backend may return:
        //
        // {
        //     "total_analyses": 4
        // }

        else if (
          typeof data.total_analyses === "number"
        ) {

          setAnalysisCount(
            data.total_analyses
          );

          return;

        }


        // =================================================
        // SET COUNT
        // =================================================

        setAnalysisCount(
          analyses.length
        );

      } catch (error) {

        console.error(
          "Unable to load EEG analysis count:",
          error
        );

        /*
         * Do not leave the dashboard showing "—".
         * If there are no accessible analyses,
         * display 0.
         */

        setAnalysisCount(0);

      } finally {

        setLoadingAnalyses(false);

      }

    };


    if (doctor?.doctor_id) {

      loadAnalysisCount();

    } else {

      setAnalysisCount(0);
      setLoadingAnalyses(false);

    }

  }, [doctor?.doctor_id]);


  // =====================================================
  // DASHBOARD UI
  // =====================================================

  return (
    <div className="dashboard-page">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">

          <div className="dashboard-logo">
            EEG
          </div>

          <div>
            <h2>
              Silent Seizure
            </h2>

            <p>
              Detection System
            </p>
          </div>

        </div>


        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav className="dashboard-nav">

          <button
            className="nav-item active"
            onClick={() =>
              onNavigate("dashboard")
            }
          >
            <span>
              ⌂
            </span>

            Dashboard
          </button>


          <button
            className="nav-item"
            onClick={() =>
              onNavigate("patients")
            }
          >
            <span>
              ♙
            </span>

            My Patients
          </button>


          <button
            className="nav-item"
            onClick={() =>
              onNavigate("analysis")
            }
          >
            <span>
              ≋
            </span>

            EEG Analysis
          </button>


          <button
            className="nav-item"
            onClick={() =>
              onNavigate("history")
            }
          >
            <span>
              ◷
            </span>

            Analysis History
          </button>


          <button
            className="nav-item"
            onClick={() =>
              onNavigate("reports")
            }
          >
            <span>
              ▣
            </span>

            Reports
          </button>

        </nav>


        {/* =================================================
            SIDEBAR BOTTOM
        ================================================= */}

        <div className="sidebar-bottom">

          <div className="clinical-note">

            <strong>
              Clinical Decision Support
            </strong>

            <p>
              For authorized healthcare
              professionals only.
            </p>

          </div>


          <button
            className="logout-button"
            onClick={onLogout}
          >
            <span>
              ↪
            </span>

            Logout
          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN DASHBOARD
      ===================================================== */}

      <main className="dashboard-main">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="dashboard-header">

          <div>

            <p className="dashboard-overline">
              DOCTOR / CLINICIAN PORTAL
            </p>


            <h1>
              Welcome back, {doctor.name}
            </h1>


           

          </div>


          {/* =================================================
              DOCTOR PROFILE
          ================================================= */}

          <div className="doctor-profile">

            <div className="doctor-avatar">

              {doctor.name
                ? doctor.name
                    .charAt(0)
                    .toUpperCase()
                : "D"}

            </div>


            <div>

              <strong>
                {doctor.name}
              </strong>

              <span>
                Healthcare Professional
              </span>

            </div>

          </div>

        </header>


        {/* =====================================================
            STAT CARDS
        ===================================================== */}

        <section className="dashboard-stats">


          {/* =================================================
              MY PATIENTS
          ================================================= */}

          <div className="stat-card">

            <div className="stat-icon">
              ♙
            </div>


            <div>

              <span>
                My Patients
              </span>


              <strong>
                {loadingPatients
                  ? "—"
                  : patients.length}
              </strong>

            </div>

          </div>


          {/* =================================================
              EEG ANALYSES
          ================================================= */}

          <div className="stat-card">

            <div className="stat-icon">
              ≋
            </div>


            <div>

              <span>
                EEG Analyses
              </span>


              <strong>
                {loadingAnalyses
                  ? "—"
                  : analysisCount}
              </strong>

            </div>

          </div>


          {/* =================================================
              SYSTEM STATUS
          ================================================= */}

          <div className="stat-card">

            <div className="stat-icon">
              ✓
            </div>


            <div>

              <span>
                System Status
              </span>


              <strong
                style={{
                  color: "#198754"
                }}
              >
                Ready
              </strong>

            </div>

          </div>

        </section>
        {/* =====================================================
            MY PATIENTS
        ===================================================== */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>

              <h2>
                My Patients
              </h2>

              <p>
                Patients assigned to your account.
              </p>

            </div>


            <button
              className="view-all-button"
              onClick={() =>
                onNavigate("patients")
              }
            >
              View All →
            </button>

          </div>


          <div className="patients-card">

            {loadingPatients ? (

              <div className="empty-state">
                Loading patients...
              </div>

            ) : error ? (

              <div className="error-dashboard">
                {error}
              </div>

            ) : patients.length === 0 ? (

              <div className="empty-state">

                <div className="empty-icon">
                  ♙
                </div>

                <h3>
                  No patients found
                </h3>

                <p>
                  Add patients from the My Patients page.
                </p>

              </div>

            ) : (

              <div className="patients-table-wrapper">

                <table className="patients-table">

                  <thead>

                    <tr>
                      <th>Patient</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Contact</th>
                      <th>Action</th>
                    </tr>

                  </thead>


                  <tbody>

                    {patients.map(
                      (patient) => (

                        <tr
                          key={
                            patient.patient_id
                          }
                        >

                          <td>

                            <div className="patient-name">

                              <div className="patient-avatar">

                                {patient.name
                                  ? patient.name
                                      .charAt(0)
                                      .toUpperCase()
                                  : "P"}

                              </div>


                              <div>

                                <strong>
                                  {patient.name}
                                </strong>

                                <span>
                                  Patient ID: P
                                  {String(
                                    patient.patient_id
                                  ).padStart(3, "0")}
                                </span>

                              </div>

                            </div>

                          </td>


                          <td>
                            {patient.age || "—"}
                          </td>


                          <td>
                            {patient.gender || "—"}
                          </td>


                          <td>
                            {patient.contact || "—"}
                          </td>


                          <td>

                            <button
                              className="patient-action"
                              onClick={() =>
                                onViewPatient(
                                  patient
                                )
                              }
                            >
                              View →
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </section>


        {/* =====================================================
            FOOTER
        ===================================================== */}

        <footer className="dashboard-footer">

          <span>
            © 2026 Silent Seizure Detection System
          </span>

          <span>
            Clinical Decision Support • Authorized Use Only
          </span>

        </footer>

      </main>

    </div>
  );
}


// =====================================================
// ADMIN DASHBOARD
// =====================================================

function AdminDashboard({ admin, onNavigate, onLogout }) {
  const [stats, setStats] = useState({
    total_doctors: 0,
    total_patients: 0,
    total_analyses: 0,
    total_reports: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API_URL}/admin/stats`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Unable to load dashboard statistics.");
        }
        setStats(data);
      } catch (error) {
        console.error(error);
        setError(error.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const logout = () => {
    sessionStorage.removeItem("admin");
    onLogout();
  };

  const cards = [
    ["Total Doctors", stats.total_doctors, "♙"],
    ["Total Patients", stats.total_patients, "♙"],
    ["Total EEG Analyses", stats.total_analyses, "≋"],
    ["Total Reports", stats.total_reports, "▣"],
  ];

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-logo">EEG</div>
          <div>
            <h2>Silent Seizure</h2>
            <p>Detection System</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <button className="nav-item active" onClick={() => onNavigate("admin-dashboard")}>
            <span>⌂</span>
            Dashboard
          </button>
          <button className="nav-item" onClick={() => onNavigate("manage-doctors")}>
            <span>♙</span>
            Manage Doctors
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="clinical-note">
            <strong>Administrator</strong>
            <p>System administration access.</p>
          </div>
          <button className="logout-button" onClick={logout}>
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-overline">ADMINISTRATOR PORTAL</p>
            <h1>Admin Dashboard</h1>
            
          </div>
          <div className="doctor-profile">
            <div className="doctor-avatar">
              {admin?.name ? admin.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <strong>{admin?.name || "Administrator"}</strong>
              <span>System Administrator</span>
            </div>
          </div>
        </header>

        {error && <div className="error-dashboard">{error}</div>}

        <section className="dashboard-stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "18px" }}>
          {cards.map(([label, value, icon]) => (
            <div className="stat-card" key={label}>
              <div className="stat-icon">{icon}</div>
              <div>
                <span>{label}</span>
                <strong>{loading ? "—" : value}</strong>
              </div>
            </div>
          ))}
        </section>



        <footer className="dashboard-footer">
          <span>© 2026 Silent Seizure Detection System</span>
          <span>Administrator Portal • Authorized Use Only</span>
        </footer>
      </main>
    </div>
  );
}


// =====================================================
// MANAGE DOCTORS PAGE
// =====================================================

function ManageDoctors({ admin, onNavigate, onLogout }) {
  const emptyForm = { name: "", email: "", password: "" };
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [viewDoctor, setViewDoctor] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_URL}/admin/doctors`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to load doctors.");
      }
      setDoctors(data.doctors || []);
    } catch (error) {
      console.error(error);
      setError(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const openAdd = () => {
    setEditingDoctor(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const openEdit = (doctor) => {
    setEditingDoctor(doctor);
    setForm({ name: doctor.name || "", email: doctor.email || "", password: "" });
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const saveDoctor = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (!editingDoctor && !form.password) {
      setError("Password is required when adding a doctor.");
      return;
    }

    setSaving(true);
    try {
      const url = editingDoctor
        ? `${API_URL}/admin/doctors/${editingDoctor.doctor_id}`
        : `${API_URL}/admin/doctors`;

      const response = await fetch(url, {
        method: editingDoctor ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to save doctor.");
      }

      setMessage(editingDoctor ? "Doctor updated successfully." : "Doctor added successfully.");
      setShowForm(false);
      setForm(emptyForm);
      setEditingDoctor(null);
      await loadDoctors();
    } catch (error) {
      console.error(error);
      setError(error.message || "Unable to save doctor.");
    } finally {
      setSaving(false);
    }
  };

  const deleteDoctor = async (doctor) => {
    const confirmed = window.confirm(
      `Delete doctor "${doctor.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/admin/doctors/${doctor.doctor_id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to delete doctor.");
      }
      setMessage("Doctor deleted successfully.");
      await loadDoctors();
    } catch (error) {
      console.error(error);
      setError(error.message || "Unable to delete doctor.");
    }
  };

  const logout = () => {
    sessionStorage.removeItem("admin");
    onLogout();
  };

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-logo">EEG</div>
          <div>
            <h2>Silent Seizure</h2>
            <p>Detection System</p>
          </div>
        </div>

        <nav className="dashboard-nav">
          <button className="nav-item" onClick={() => onNavigate("admin-dashboard")}>
            <span>⌂</span>
            Dashboard
          </button>
          <button className="nav-item active" onClick={() => onNavigate("manage-doctors")}>
            <span>♙</span>
            Manage Doctors
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="clinical-note">
            <strong>Administrator</strong>
            <p>System administration access.</p>
          </div>
          <button className="logout-button" onClick={logout}>
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-overline">ADMINISTRATOR PORTAL</p>
            <h1>Manage Doctors</h1>
           
          </div>
          <div className="doctor-profile">
            <div className="doctor-avatar">
              {admin?.name ? admin.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div>
              <strong>{admin?.name || "Administrator"}</strong>
              <span>System Administrator</span>
            </div>
          </div>
        </header>

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Doctor Accounts</h2>
              <p>{doctors.length} doctor account{doctors.length === 1 ? "" : "s"} registered.</p>
            </div>
            <button className="login-button" style={{ width: "auto", padding: "12px 20px" }} onClick={openAdd}>
              + Add Doctor
            </button>
          </div>

          {error && <div className="error-dashboard" style={{ marginBottom: "16px" }}>{error}</div>}
          {message && <div style={{ padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", background: "#eef8f0", color: "#246b35" }}>{message}</div>}

          <div className="patients-card">
            {loading ? (
              <div className="empty-state">Loading doctors...</div>
            ) : doctors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">♙</div>
                <h3>No doctors found</h3>
                <p>Add the first doctor account using the button above.</p>
              </div>
            ) : (
              <div className="patients-table-wrapper">
                <table className="patients-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Email</th>
                      <th>Doctor ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doctor) => (
                      <tr key={doctor.doctor_id}>
                        <td>
                          <div className="patient-name">
                            <div className="patient-avatar">
                              {(doctor.name || "D").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong>{doctor.name}</strong>
                              <span>Healthcare Professional</span>
                            </div>
                          </div>
                        </td>
                        <td>{doctor.email || "—"}</td>
                        <td>D{String(doctor.doctor_id).padStart(3, "0")}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <button className="patient-action" onClick={() => setViewDoctor(doctor)}>View</button>
                            <button className="patient-action" onClick={() => openEdit(doctor)}>Edit</button>
                            <button className="patient-action" onClick={() => deleteDoctor(doctor)} style={{ color: "#b42318" }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>© 2026 Silent Seizure Detection System</span>
          <span>Administrator Portal • Authorized Use Only</span>
        </footer>
      </main>

      {showForm && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <h2>{editingDoctor ? "Edit Doctor" : "Add Doctor"}</h2>
            <p style={{ marginTop: 0, color: "#667085" }}>
              {editingDoctor ? "Update doctor account information." : "Create a new doctor account."}
            </p>
            <form onSubmit={saveDoctor}>
              <div className="form-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter doctor name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Enter doctor email"
                  required
                />
              </div>
              <div className="form-group">
                <label>{editingDoctor ? "New Password (optional)" : "Password"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingDoctor ? "Leave blank to keep current password" : "Enter password"}
                  required={!editingDoctor}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="patient-action" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="login-button" style={{ width: "auto", padding: "11px 20px" }} disabled={saving}>
                  {saving ? "Saving..." : editingDoctor ? "Update Doctor" : "Add Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewDoctor && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <h2>Doctor Details</h2>
            <div style={{ display: "grid", gap: "12px", marginTop: "20px" }}>
              <div><strong>Name:</strong> {viewDoctor.name}</div>
              <div><strong>Email:</strong> {viewDoctor.email}</div>
              <div><strong>Doctor ID:</strong> D{String(viewDoctor.doctor_id).padStart(3, "0")}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
              <button className="login-button" style={{ width: "auto", padding: "11px 20px" }} onClick={() => setViewDoctor(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  zIndex: 1000,
};

const modalCard = {
  width: "100%",
  maxWidth: "520px",
  background: "#ffffff",
  borderRadius: "16px",
  padding: "28px",
  boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
};


// =====================================================
// MAIN APP
// =====================================================

function App() {

  // =====================================================
  // DOCTOR LOGIN STATE
  // =====================================================
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctor, setDoctor] = useState(() => {

    const savedDoctor =
      sessionStorage.getItem("doctor");

    return savedDoctor
      ? JSON.parse(savedDoctor)
      : null;

  });

  // =====================================================
  // ADMIN LOGIN STATE
  // =====================================================
  const [admin, setAdmin] = useState(() => {
    const savedAdmin = sessionStorage.getItem("admin");
    return savedAdmin ? JSON.parse(savedAdmin) : null;
  });

  const [loginType, setLoginType] = useState("doctor");


  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // =====================================================
  // FORGOT PASSWORD STATE
  // =====================================================
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");


  // =====================================================
  // LOGIN FUNCTION
  // =====================================================

  const handleLogin = async (event) => {

    event.preventDefault();

    setLoginError("");
    setLoading(true);


    try {

      const response = await fetch(
        `${API_URL}/doctors/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );


      const data = await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
            "Invalid email or password."
        );

      }


      // =====================================================
      // SAVE LOGGED-IN DOCTOR
      // =====================================================

      const doctorData = {

        doctor_id: data.doctor_id,

        name: data.name,

        email: data.email,

      };


      setDoctor(doctorData);
      setAdmin(null);
      sessionStorage.removeItem("admin");
      setCurrentPage("dashboard");

      sessionStorage.setItem(
        "doctor",
        JSON.stringify(doctorData)
      );


    } catch (error) {

      console.error(error);

      setLoginError(
        error.message ||
          "Unable to connect to the server."
      );

    } finally {

      setLoading(false);

    }

  };


  // =====================================================
  // OPEN FORGOT PASSWORD
  // =====================================================
  const openForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotStep(1);
    setForgotEmail(email);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
  };

  // =====================================================
  // CLOSE FORGOT PASSWORD
  // =====================================================
  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotStep(1);
    setForgotEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
  };

  // =====================================================
  // SEND OTP
  // =====================================================
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!forgotEmail.trim()) {
      setForgotError("Please enter your registered email address.");
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/doctors/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: forgotEmail.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to send OTP.");
      }

      console.log("Development OTP:", data.development_otp);

      setForgotSuccess(
        "OTP has been generated. Check the backend terminal for the OTP."
      );
      setForgotStep(2);
    } catch (error) {
      console.error("OTP error:", error);
      setForgotError(error.message || "Unable to connect to the server.");
    } finally {
      setForgotLoading(false);
    }
  };

  // =====================================================
  // VERIFY OTP
  // =====================================================
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (!/^\d{6}$/.test(otp.trim())) {
      setForgotError("OTP must contain exactly 6 digits.");
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/doctors/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: forgotEmail.trim(),
            otp: otp.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid OTP.");
      }

      setForgotSuccess("OTP verified successfully.");
      setForgotStep(3);
    } catch (error) {
      console.error("OTP verification error:", error);
      setForgotError(error.message || "Unable to verify OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  // =====================================================
  // RESET PASSWORD
  // =====================================================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");

    if (newPassword.length < 6) {
      setForgotError("Password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/doctors/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: forgotEmail.trim(),
            otp: otp.trim(),
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to reset password.");
      }

      setForgotSuccess("Your password has been reset successfully.");
      setForgotStep(4);
    } catch (error) {
      console.error("Password reset error:", error);
      setForgotError(error.message || "Unable to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  // =====================================================
  // BACK TO LOGIN
  // =====================================================
  const backToLogin = () => {
    const resetEmail = forgotEmail;
    closeForgotPassword();
    setEmail(resetEmail);
    setPassword("");
    setLoginError("");
    setLoginType("doctor");
  };

  // =====================================================
  // ADMIN LOGIN FUNCTION
  // =====================================================

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        body: new URLSearchParams({
          email: email.trim(),
          password: password,
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Invalid admin email or password.");
      }

      const adminData = {
        admin_id: data.admin_id,
        name: data.name,
        email: data.email,
      };

      sessionStorage.setItem("admin", JSON.stringify(adminData));
      sessionStorage.removeItem("doctor");
      setDoctor(null);
      setAdmin(adminData);
      setCurrentPage("admin-dashboard");
    } catch (error) {
      console.error(error);
      setLoginError(error.message || "Admin login failed.");
    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // IF ADMIN IS LOGGED IN
  // =====================================================

  if (admin) {
    if (currentPage === "manage-doctors") {
      return (
        <ManageDoctors
          admin={admin}
          onNavigate={setCurrentPage}
          onLogout={() => {
            clearAuthSession();
            setAdmin(null);
            setDoctor(null);
            setCurrentPage("dashboard");
          }}
        />
      );
    }

    return (
      <AdminDashboard
        admin={admin}
        onNavigate={setCurrentPage}
        onLogout={() => {
          clearAuthSession();
          setAdmin(null);
          setDoctor(null);
          setCurrentPage("dashboard");
        }}
      />
    );
  }


  // =====================================================
  // IF DOCTOR IS LOGGED IN
  // SHOW DASHBOARD
  // =====================================================

 if (doctor) {

  if (currentPage === "analysis") {
    return (
      <EEGAnalysis
        doctor={doctor}
        onBack={() => setCurrentPage("patients")}
        onNavigate={setCurrentPage}
        onLogout={() => {
          clearAuthSession();
          setDoctor(null);
          setAdmin(null);
          setCurrentPage("dashboard");
          setSelectedPatient(null);
        }}
      />
    );
  }

  if (currentPage === "history") {
    return (
      <AnalysisHistory
        doctor={doctor}
        onNavigate={setCurrentPage}
        onLogout={() => {
          clearAuthSession();
          setDoctor(null);
          setAdmin(null);
          setCurrentPage("dashboard");
          setSelectedPatient(null);
        }}
      />
    );
  }

  if (currentPage === "reports") {
    return (
      <Reports
        doctor={doctor}
        onNavigate={setCurrentPage}
        onLogout={() => {
          clearAuthSession();
          setDoctor(null);
          setAdmin(null);
          setCurrentPage("dashboard");
          setSelectedPatient(null);
        }}
      />
    );
  }

  if (currentPage === "patient-details" && selectedPatient) {
    return (
      <PatientDetails
        doctor={doctor}
        patient={selectedPatient}
        onBack={() => setCurrentPage("patients")}
        onNavigate={setCurrentPage}
        onLogout={() => {
          clearAuthSession();
          setDoctor(null);
          setAdmin(null);
          setCurrentPage("dashboard");
          setSelectedPatient(null);
        }}
      />
    );
  }

  if (currentPage === "patients") {
    return (
      <MyPatients
        doctor={doctor}
        onBack={() => setCurrentPage("dashboard")}
        onViewPatient={(patient) => {
          setSelectedPatient(patient);
          setCurrentPage("patient-details");
        }}
        onNavigate={setCurrentPage}
        onLogout={() => {
          clearAuthSession();
          setDoctor(null);
          setAdmin(null);
          setCurrentPage("dashboard");
          setSelectedPatient(null);
        }}
      />
    );
  }

  return (
    <Dashboard
      doctor={doctor}
      onNavigate={setCurrentPage}
      onViewPatient={(patient) => {
        setSelectedPatient(patient);
        setCurrentPage("patient-details");
      }}
      onLogout={() => {
        sessionStorage.removeItem("doctor");
        setDoctor(null);
        setCurrentPage("dashboard");
        setSelectedPatient(null);
      }}
    />
  );

}

  // =====================================================
  // LOGIN PAGE
  // =====================================================

  return (

    <div className="app">

      <div className="login-container">

        <div className="login-card">

          {/* LOGO */}

          <div className="login-logo">
            EEG
          </div>


          {/* TITLE */}

          <h1>
            Silent Seizure
          </h1>

          <h2>
            Detection System
          </h2>


          <div style={{ display: "flex", gap: "8px", margin: "18px 0 14px" }}>
            <button
              type="button"
              onClick={() => { setLoginType("doctor"); setLoginError(""); }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "9px",
                border: loginType === "doctor" ? "1px solid #1f6f8b" : "1px solid #d0d5dd",
                background: loginType === "doctor" ? "#eef8fb" : "#ffffff",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Doctor / Clinician
            </button>
            <button
              type="button"
              onClick={() => { setLoginType("admin"); setLoginError(""); }}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "9px",
                border: loginType === "admin" ? "1px solid #1f6f8b" : "1px solid #d0d5dd",
                background: loginType === "admin" ? "#eef8fb" : "#ffffff",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Admin
            </button>
          </div>

          <p className="login-subtitle">
            {loginType === "doctor" ? "Doctor / Clinician Login" : "Administrator Login"}
          </p>


          {/* LOGIN FORM */}

          <form onSubmit={loginType === "doctor" ? handleLogin : handleAdminLogin}>

            {/* EMAIL */}

            <div className="form-group">

              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
              />

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

            </div>

            {/* FORGOT PASSWORD - DOCTOR ONLY */}
            {loginType === "doctor" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                  marginBottom: "12px"
                }}
              >
                <button
                  type="button"
                  onClick={openForgotPassword}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#1d4f82",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}


            {/* ERROR */}

            {loginError && (

              <div className="login-error">
                {loginError}
              </div>

            )}


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading
                ? "Signing in..."
                : loginType === "doctor"
                  ? "Doctor Login"
                  : "Admin Login"}

            </button>

          </form>


          {/* SECURITY NOTE */}

          <div className="login-note">

            <strong>
              Clinical Decision Support
            </strong>

            <p>
              Authorized healthcare professionals
              only.
            </p>

          </div>


          {/* =====================================================
              FORGOT PASSWORD MODAL
          ===================================================== */}
          {showForgotPassword && (
            <div
              className="modal-overlay"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) closeForgotPassword();
              }}
            >
              <div className="forgot-modal">
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeForgotPassword}
                  aria-label="Close"
                >
                  ×
                </button>

                {forgotStep === 1 && (
                  <>
                    <div className="forgot-icon">@</div>
                    <h2>Forgot Password?</h2>
                    <p className="modal-description">
                      Enter your registered email address and we'll help you reset your password.
                    </p>
                    <form onSubmit={handleSendOTP}>
                      <div className="form-field">
                        <label>Registered Email Address</label>
                        <div className="input-box">
                          <span className="field-icon">@</span>
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => {
                              setForgotEmail(e.target.value);
                              setForgotError("");
                            }}
                            placeholder="Enter your email"
                            autoFocus
                          />
                        </div>
                      </div>
                      {forgotError && <div className="error-message">{forgotError}</div>}
                      <button type="submit" className="login-button" disabled={forgotLoading}>
                        {forgotLoading ? "Sending OTP..." : "Send OTP →"}
                      </button>
                    </form>
                  </>
                )}

                {forgotStep === 2 && (
                  <>
                    <div className="forgot-icon">#</div>
                    <h2>Verify OTP</h2>
                    <p className="modal-description">
                      Enter the 6-digit verification code generated for <strong>{forgotEmail}</strong>.
                    </p>
                    {forgotSuccess && <div className="success-message">{forgotSuccess}</div>}
                    <form onSubmit={handleVerifyOTP}>
                      <div className="form-field">
                        <label>Verification Code</label>
                        <input
                          className="otp-input"
                          type="text"
                          inputMode="numeric"
                          maxLength="6"
                          value={otp}
                          onChange={(e) => {
                            setOtp(e.target.value.replace(/\D/g, ""));
                            setForgotError("");
                          }}
                          placeholder="••••••"
                          autoFocus
                        />
                      </div>
                      {forgotError && <div className="error-message">{forgotError}</div>}
                      <button type="submit" className="login-button" disabled={forgotLoading}>
                        {forgotLoading ? "Verifying..." : "Verify OTP →"}
                      </button>
                    </form>
                    <button
                      type="button"
                      className="back-button"
                      onClick={() => { setForgotStep(1); setForgotError(""); setForgotSuccess(""); }}
                    >
                      ← Use a different email
                    </button>
                  </>
                )}

                {forgotStep === 3 && (
                  <>
                    <div className="forgot-icon">🔒</div>
                    <h2>Create New Password</h2>
                    <p className="modal-description">
                      Create a new password for your healthcare professional account.
                    </p>
                    <form onSubmit={handleResetPassword}>
                      <div className="form-field">
                        <label>New Password</label>
                        <div className="input-box">
                          <span className="field-icon">•</span>
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setForgotError(""); }}
                            placeholder="Enter new password"
                            autoFocus
                          />
                          <button type="button" className="show-password" onClick={() => setShowNewPassword(!showNewPassword)}>
                            {showNewPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                      <div className="form-field">
                        <label>Confirm New Password</label>
                        <div className="input-box">
                          <span className="field-icon">•</span>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setForgotError(""); }}
                            placeholder="Confirm new password"
                          />
                          <button type="button" className="show-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                      </div>
                      {forgotError && <div className="error-message">{forgotError}</div>}
                      <button type="submit" className="login-button" disabled={forgotLoading}>
                        {forgotLoading ? "Resetting Password..." : "Reset Password →"}
                      </button>
                    </form>
                    <button
                      type="button"
                      className="back-button"
                      onClick={() => { setForgotStep(2); setForgotError(""); setForgotSuccess(""); }}
                    >
                      ← Back to OTP
                    </button>
                  </>
                )}

                {forgotStep === 4 && (
                  <>
                    <div className="forgot-icon" style={{ background: "#e8f8ef", color: "#16834c" }}>✓</div>
                    <h2>Password Reset Successful</h2>
                    <p className="modal-description">
                      Your password has been updated successfully. You can now sign in using your new password.
                    </p>
                    {forgotSuccess && <div className="success-message">{forgotSuccess}</div>}
                    <button type="button" className="login-button" onClick={backToLogin}>
                      Return to Login →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>

  );
}


// =====================================================
// EXPORT APP
// =====================================================

export default App;