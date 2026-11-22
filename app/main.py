"""
VouchPay — The Last-Mile Verifier
FastAPI application entry-point with strict AI generation metadata detection,
local ELA block analysis, and dynamic dual-party handshake scoring.
"""

import os
import uuid
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.forensics.analyzer import ForensicAnalyzer
from app.ai_engine.extractor import AIExtractor
from app.rules.validator import RuleValidator
from app.pdf.cert_gen import CertificateGenerator
from app.schemas import VerificationRecord
from app.firebase_db import (
    init_firebase,
    save_user_verification,
    get_user_verifications,
    update_handshake_status,
)

load_dotenv()

# Initialize Firebase on startup
init_firebase()

app = FastAPI(title="VouchPay — The Last-Mile Verifier")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="app/templates")

FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
)
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    src_assets = os.path.join(FRONTEND_DIST, "src", "assets")
    if os.path.exists(src_assets):
        app.mount("/src/assets", StaticFiles(directory=src_assets), name="src_assets")

records: dict[str, VerificationRecord] = {}


# ================================================================== helpers
def _calculate_trust_score(forensics, extraction, rule_flags, handshake: str = "PENDING") -> int:
    """
    Weighted 0-100 Trust Score across 4 exact parameters:
      1. Pixel Forensics (ELA): 30%
      2. AI / OCR Visual & Font Audit: 25%
      3. Rules & Metadata: 20%
      4. Dual-Party Handshake: 25%
    """
    # 1. Pixel Forensics (30 points)
    if forensics.tamper_score >= 60.0:
        ela_score = 0.0
    elif forensics.tamper_score >= 30.0:
        ela_score = max(5.0, 30.0 * (1.0 - (forensics.tamper_score / 60.0)))
    else:
        ela_score = 30.0 * (1.0 - (forensics.tamper_score / 70.0))

    # 2. AI / OCR Visual & Font Audit (25 points)
    ai_penalties = len(extraction.visual_anomalies) * 10.0
    ai_score = max(0.0, 25.0 - ai_penalties)

    # 3. Rules & Metadata (20 points)
    all_flags = rule_flags + forensics.exif_flags
    has_ai_metadata = any("AI_METADATA_DETECTED" in f or "AI_SPOOF_ALERT" in f for f in all_flags)
    has_editor_metadata = any("EDITOR_METADATA_DETECTED" in f or "EDITOR_SPOOF_ALERT" in f for f in all_flags)

    if has_ai_metadata:
        rules_score = 0.0
    elif has_editor_metadata:
        rules_score = 0.0
    else:
        deductions = sum(8.0 for f in rule_flags if any(k in f for k in ["UTR", "AMOUNT", "TIMESTAMP", "LAYOUT"]))
        rules_score = max(0.0, 20.0 - deductions)

    # 4. Dual-Party Handshake (25 points)
    if handshake == "CONFIRMED":
        handshake_score = 25.0
    elif handshake == "DISPUTED":
        handshake_score = -25.0
    else:  # PENDING
        handshake_score = 0.0

    raw_score = ela_score + ai_score + rules_score + handshake_score

    # Hard overrides for AI generation, editing software, and extreme ELA tampering
    if has_ai_metadata:
        return max(5, min(18, int(raw_score if raw_score < 18 else 12)))
    if has_editor_metadata:
        return max(8, min(28, int(raw_score if raw_score < 28 else 22)))
    if forensics.tamper_score >= 60.0:
        return max(10, min(38, int(raw_score if raw_score < 38 else 30)))

    return max(0, min(100, int(raw_score)))


# ================================================================= routes
@app.get("/")
async def root():
    index_html = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index_html):
        return FileResponse(index_html)
    return FileResponse("app/templates/index.html")


@app.get("/legacy", response_class=HTMLResponse)
async def legacy_index(request: Request):
    return templates.TemplateResponse(request, "index.html")


@app.post("/upload")
async def upload_screenshot(request: Request, file: UploadFile = File(...)):
    tx_id = uuid.uuid4().hex[:8]
    upload_dir = os.path.join("static", "uploads", tx_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    analyzer = ForensicAnalyzer()
    forensic_result = analyzer.analyze(file_path, upload_dir)

    extractor = AIExtractor()
    extraction_result = extractor.extract(file_path)

    validator = RuleValidator()
    rule_flags = validator.validate(forensic_result, extraction_result)

    trust_score = _calculate_trust_score(forensic_result, extraction_result, rule_flags, handshake="PENDING")
    
    # Check if AI or editor was found
    all_flags = rule_flags + forensic_result.exif_flags
    is_spoofed = any("AI_METADATA_DETECTED" in f or "AI_SPOOF_ALERT" in f or "EDITOR_METADATA_DETECTED" in f or "EDITOR_SPOOF_ALERT" in f for f in all_flags)

    status = (
        "DISPUTED" if (is_spoofed or trust_score < 50)
        else "SUSPICIOUS" if trust_score < 80
        else "CONFIRMED"
    )

    record = VerificationRecord(
        tx_id=tx_id,
        status=status,
        trust_score=trust_score,
        handshake_status="PENDING",
        forensics=forensic_result,
        extraction=extraction_result,
        rule_flags=rule_flags,
        created_at=datetime.now().isoformat(),
    )
    records[tx_id] = record

    gen = CertificateGenerator()
    gen.generate(record, tx_id)

    # Redirect to /verify/{tx_id} so URL matches and reload works without form resubmission
    return RedirectResponse(url=f"/verify/{tx_id}", status_code=303)


@app.post("/api/analyze")
async def api_analyze(file: UploadFile = File(...), user_id: str = Form(None)):
    tx_id = uuid.uuid4().hex[:8]
    upload_dir = os.path.join("static", "uploads", tx_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, file.filename)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # 1. Forensic ELA & AI/Editor Metadata Scanner
    analyzer = ForensicAnalyzer()
    forensic_result = analyzer.analyze(file_path, upload_dir)

    # 2. Local RapidOCR & OpenCV Font Forensics
    extractor = AIExtractor()
    extraction_result = extractor.extract(file_path)

    # 3. Rule Validation Engine
    validator = RuleValidator()
    rule_flags = validator.validate(forensic_result, extraction_result)

    # 4. Trust Score
    trust_score = _calculate_trust_score(forensic_result, extraction_result, rule_flags, handshake="PENDING")

    all_flags = rule_flags + forensic_result.exif_flags
    is_spoofed = any("AI_METADATA_DETECTED" in f or "AI_SPOOF_ALERT" in f or "EDITOR_METADATA_DETECTED" in f or "EDITOR_SPOOF_ALERT" in f for f in all_flags)

    status = (
        "DISPUTED" if (is_spoofed or trust_score < 50)
        else "SUSPICIOUS" if trust_score < 80
        else "CONFIRMED"
    )

    record = VerificationRecord(
        tx_id=tx_id,
        status=status,
        trust_score=trust_score,
        handshake_status="PENDING",
        forensics=forensic_result,
        extraction=extraction_result,
        rule_flags=rule_flags,
        created_at=datetime.now().isoformat(),
    )
    records[tx_id] = record

    gen = CertificateGenerator()
    gen.generate(record, tx_id)

    res_data = {
        "tx_id": tx_id,
        "status": status,
        "trust_score": trust_score,
        "handshake_status": "PENDING",
        "amount": extraction_result.amount,
        "utr": extraction_result.utr,
        "receipt_date": extraction_result.receipt_date,
        "receipt_time": extraction_result.receipt_time,
        "app_name": extraction_result.app_name,
        "ela_image_url": f"/static/uploads/{tx_id}/ela_heatmap.jpg",
        "original_image_url": f"/static/uploads/{tx_id}/{file.filename}",
        "pdf_url": f"/verify/{tx_id}/pdf",
        "tamper_score": forensic_result.tamper_score,
        "image_sha256": forensic_result.image_sha256,
        "exif_flags": forensic_result.exif_flags,
        "visual_anomalies": extraction_result.visual_anomalies,
        "rule_flags": rule_flags,
        "created_at": record.created_at,
        "user_id": user_id or "anonymous",
    }

    # Save to Firebase Firestore under specific user
    if user_id:
        save_user_verification(user_id, res_data)

    return res_data


@app.get("/verify/{tx_id}", response_class=HTMLResponse)
async def verify_page(request: Request, tx_id: str):
    record = records.get(tx_id)
    if not record:
        return HTMLResponse("<h1>Verification record not found</h1>", status_code=404)

    upload_dir = os.path.join("static", "uploads", tx_id)
    original_img = ""
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            if f != "ela_heatmap.jpg" and not f.endswith(".pdf"):
                original_img = f"/static/uploads/{tx_id}/{f}"
                break

    return templates.TemplateResponse(request, "verify.html", context={
        "record": record,
        "tx_id": tx_id,
        "ela_image": f"/static/uploads/{tx_id}/ela_heatmap.jpg",
        "original_image": original_img,
    })


@app.post("/verify/{tx_id}/confirm")
async def confirm(tx_id: str):
    rec = records.get(tx_id)
    if not rec:
        return JSONResponse({"error": "not found"}, status_code=404)

    rec.handshake_status = "CONFIRMED"
    rec.trust_score = _calculate_trust_score(
        rec.forensics, rec.extraction, rec.rule_flags, handshake="CONFIRMED"
    )
    all_flags = rec.rule_flags + rec.forensics.exif_flags
    is_spoofed = any("AI_METADATA_DETECTED" in f or "AI_SPOOF_ALERT" in f or "EDITOR_METADATA_DETECTED" in f or "EDITOR_SPOOF_ALERT" in f for f in all_flags)
    rec.status = "DISPUTED" if (is_spoofed or rec.trust_score < 50) else "CONFIRMED"

    gen = CertificateGenerator()
    gen.generate(rec, tx_id)

    # Sync to Firebase
    update_handshake_status(tx_id, rec.status, rec.trust_score, "CONFIRMED")

    return {
        "status": rec.status,
        "trust_score": rec.trust_score,
        "handshake_status": "CONFIRMED",
    }


@app.post("/verify/{tx_id}/dispute")
async def dispute(tx_id: str):
    rec = records.get(tx_id)
    if not rec:
        return JSONResponse({"error": "not found"}, status_code=404)

    rec.handshake_status = "DISPUTED"
    rec.trust_score = _calculate_trust_score(
        rec.forensics, rec.extraction, rec.rule_flags, handshake="DISPUTED"
    )
    rec.status = "DISPUTED"

    gen = CertificateGenerator()
    gen.generate(rec, tx_id)

    # Sync to Firebase
    update_handshake_status(tx_id, rec.status, rec.trust_score, "DISPUTED")

    return {
        "status": rec.status,
        "trust_score": rec.trust_score,
        "handshake_status": "DISPUTED",
    }


@app.get("/api/user/{user_id}/verifications")
async def api_get_user_verifications(user_id: str):
    """Returns verification history for the specific logged-in user."""
    results = get_user_verifications(user_id)
    if not results:
        # Fallback to in-memory records matching user_id
        results = [r.model_dump() for r in records.values() if getattr(r, "user_id", None) == user_id]
    return results


@app.get("/verify/{tx_id}/pdf")
async def download_pdf(tx_id: str):
    rec = records.get(tx_id)
    if not rec:
        return JSONResponse({"error": "not found"}, status_code=404)
    gen = CertificateGenerator()
    path = gen.generate(rec, tx_id)
    return FileResponse(path, filename=f"VouchPay_Certificate_{tx_id}.pdf")


@app.get("/api/verify/{tx_id}")
async def api_verify(tx_id: str):
    rec = records.get(tx_id)
    if not rec:
        return JSONResponse({"error": "not found"}, status_code=404)
    return rec.model_dump()
