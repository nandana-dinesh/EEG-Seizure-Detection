
import os
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable
)


# --------------------------------------------------
# Helper functions
# --------------------------------------------------

def safe_text(value):
    """Safely format database values for ReportLab paragraphs."""
    if value is None or str(value).strip() == "":
        return "Not Available"

    return escape(str(value))


def format_date(value):
    """Format a database date/datetime for the PDF."""
    if value is None:
        return "Not Available"

    if isinstance(value, datetime):
        return value.strftime("%d %B %Y, %I:%M %p")

    return safe_text(value)


def normalize_prediction(prediction):
    """Convert the stored prediction into a readable examination result."""
    value = str(prediction or "").strip().lower()
    value = value.replace("_", " ").replace("-", " ")

    if "no seizure" in value or "non seizure" in value:
        return "No Seizure Detected"

    if "seizure" in value:
        return "Seizure Detected"

    return "Result Unavailable"


def draw_footer(canvas, doc):
    """Draw a confidentiality footer and page number."""
    canvas.saveState()

    page_width, _ = A4

    canvas.setStrokeColor(colors.HexColor("#D6DEE8"))
    canvas.setLineWidth(0.5)
    canvas.line(
        20 * mm,
        18 * mm,
        page_width - 20 * mm,
        18 * mm
    )

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#526174"))

    canvas.drawString(
        20 * mm,
        12 * mm,
        "Confidential - For authorized review"
    )

    canvas.drawRightString(
        page_width - 20 * mm,
        12 * mm,
        f"Page {doc.page}"
    )

    canvas.restoreState()


# --------------------------------------------------
# PDF report generation
# --------------------------------------------------

def generate_pdf_report(
    analysis_id,
    patient_id,
    patient_name,
    patient_age,
    patient_gender,
    eeg_file,
    doctor_name,
    prediction,
    seizure_probability,
    analysis_date,
    report_path
):
    """
    Generate a medical-style EEG examination report.

    Model details and seizure probability are intentionally
    excluded from the visible PDF.
    """

    report_directory = os.path.dirname(report_path)

    if report_directory:
        os.makedirs(report_directory, exist_ok=True)

    doc = SimpleDocTemplate(
        report_path,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=25 * mm,
        title="EEG Examination Report",
        author="Silent Seizure Detection System"
    )

    # --------------------------------------------------
    # Styles
    # --------------------------------------------------

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "MedicalTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=19,
        leading=23,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17365D"),
        spaceAfter=5
    )

    subtitle_style = ParagraphStyle(
        "MedicalSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#526174"),
        spaceAfter=10
    )

    section_style = ParagraphStyle(
        "MedicalSection",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#17365D"),
        spaceBefore=10,
        spaceAfter=7
    )

    body_style = ParagraphStyle(
        "MedicalBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=14,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#263445"),
        spaceAfter=5
    )

    small_style = ParagraphStyle(
        "MedicalSmall",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#526174")
    )

    result_style = ParagraphStyle(
        "ExaminationResult",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17365D")
    )

    # --------------------------------------------------
    # Examination result and findings
    # --------------------------------------------------

    result_text = normalize_prediction(prediction)

    if result_text == "Seizure Detected":
        result_description = (
            "The analyzed EEG recording was classified as showing "
            "potential seizure-related activity. The finding requires "
            "review by a qualified healthcare professional."
        )

        impression_text = (
            "Potential seizure-related activity was flagged in the "
            "analyzed recording. Correlation with the EEG tracing, "
            "clinical history, and professional interpretation is required."
        )

    elif result_text == "No Seizure Detected":
        result_description = (
            "The analyzed EEG recording was classified as showing "
            "no seizure activity by the examination system. This does "
            "not exclude seizure activity outside the analyzed recording "
            "or guarantee the absence of a seizure disorder."
        )

        impression_text = (
            "No seizure activity was flagged in the analyzed recording. "
            "The finding should be interpreted alongside the full EEG "
            "recording and the patient's clinical history."
        )

    else:
        result_description = (
            "A readable examination result is not available for this "
            "record. Please verify the stored examination result."
        )

        impression_text = (
            "The examination result requires verification before "
            "a clinical interpretation can be recorded."
        )

    # --------------------------------------------------
    # Build report
    # --------------------------------------------------

    story = []

    story.append(Paragraph("EEG EXAMINATION REPORT", title_style))
    story.append(
        Paragraph(
            "ELECTROENCEPHALOGRAM (EEG) • EXAMINATION SUMMARY",
            subtitle_style
        )
    )

    story.append(
        HRFlowable(
            width="100%",
            thickness=1.2,
            color=colors.HexColor("#17365D"),
            spaceBefore=2,
            spaceAfter=10
        )
    )

    # Report identification
    report_info = [
        [
            Paragraph(
                f"<b>Report Number:</b> EEG-{safe_text(analysis_id)}",
                small_style
            ),
            Paragraph(
                f"<b>Report Generated:</b> "
                f"{datetime.now().strftime('%d %B %Y, %I:%M %p')}",
                small_style
            )
        ]
    ]

    report_info_table = Table(
        report_info,
        colWidths=[80 * mm, 85 * mm]
    )

    report_info_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("BACKGROUND", (0, 0), (-1, -1),
             colors.HexColor("#F3F6FA")),
        ])
    )

    story.append(report_info_table)
    story.append(Spacer(1, 8))

    # Patient and examination details
    story.append(
        Paragraph("1. PATIENT &amp; EXAMINATION DETAILS", section_style)
    )

    details_data = [
        [
            Paragraph("<b>Patient Name</b>", body_style),
            Paragraph(safe_text(patient_name), body_style)
        ],
        [
            Paragraph("<b>Patient ID</b>", body_style),
            Paragraph(safe_text(patient_id), body_style)
        ],
        [
            Paragraph("<b>Age</b>", body_style),
            Paragraph(
                f"{safe_text(patient_age)} years"
                if patient_age is not None
                else "Not Available",
                body_style
            )
        ],
        [
            Paragraph("<b>Gender</b>", body_style),
            Paragraph(safe_text(patient_gender), body_style)
        ],
        [
            Paragraph("<b>Examination</b>", body_style),
            Paragraph("Electroencephalogram (EEG)", body_style)
        ],
        [
            Paragraph("<b>Recording File</b>", body_style),
            Paragraph(safe_text(eeg_file), body_style)
        ],
        [
            Paragraph("<b>Examination Date</b>", body_style),
            Paragraph(format_date(analysis_date), body_style)
        ],
        [
            Paragraph("<b>Doctor / Clinician</b>", body_style),
            Paragraph(safe_text(doctor_name), body_style)
        ],
    ]

    details_table = Table(
        details_data,
        colWidths=[48 * mm, 117 * mm],
        repeatRows=0
    )

    details_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.HexColor("#EAF0F6")
            ),
            (
                "BACKGROUND",
                (1, 0),
                (1, -1),
                colors.white
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.HexColor("#D5DEE8")
            ),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )

    story.append(details_table)
    story.append(Spacer(1, 8))

    # Examination result
    story.append(
        Paragraph("2. EXAMINATION RESULT", section_style)
    )

    result_background = (
        colors.HexColor("#FCECEC")
        if result_text == "Seizure Detected"
        else colors.HexColor("#EAF5ED")
        if result_text == "No Seizure Detected"
        else colors.HexColor("#FFF5DF")
    )

    result_table = Table(
        [[Paragraph(safe_text(result_text), result_style)]],
        colWidths=[165 * mm]
    )

    result_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), result_background),
            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.8,
                colors.HexColor("#C9D4E0")
            ),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 14),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ])
    )

    story.append(result_table)
    story.append(Spacer(1, 8))

    # Findings
    story.append(
        Paragraph("3. FINDINGS", section_style)
    )

    story.append(
        Paragraph(safe_text(result_description), body_style)
    )

    # Clinical impression
    story.append(
        Paragraph("4. CLINICAL IMPRESSION", section_style)
    )

    story.append(
        Paragraph(safe_text(impression_text), body_style)
    )

    # Doctor remarks
    story.append(
        Paragraph("5. DOCTOR'S REMARKS", section_style)
    )

    remarks_data = [
        [Paragraph("&nbsp;", body_style)],
        [Paragraph("&nbsp;", body_style)],
        [Paragraph("&nbsp;", body_style)]
    ]

    remarks_table = Table(
        remarks_data,
        colWidths=[165 * mm],
        rowHeights=[9 * mm, 9 * mm, 9 * mm]
    )

    remarks_table.setStyle(
        TableStyle([
            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.6,
                colors.HexColor("#BFC9D5")
            ),
            (
                "INNERGRID",
                (0, 0),
                (-1, -1),
                0.4,
                colors.HexColor("#E0E5EB")
            ),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )

    story.append(remarks_table)
    story.append(Spacer(1, 12))

    # Disclaimer
    disclaimer = (
        "<b>Important notice:</b> This report summarizes the output "
        "of a project examination system. It is not a confirmed medical "
        "diagnosis and does not replace professional EEG interpretation "
        "or clinical assessment. The Doctor's Remarks section is "
        "provided for authorized review and completion."
    )

    story.append(
        Paragraph(disclaimer, small_style)
    )

    # Generate PDF
    doc.build(
        story,
        onFirstPage=draw_footer,
        onLaterPages=draw_footer
    )
