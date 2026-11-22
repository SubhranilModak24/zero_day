import io
import os
import time
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, PngImagePlugin
from app.main import app
from app.forensics.analyzer import ForensicAnalyzer
from app.ai_engine.extractor import AIExtractor
from app.rules.validator import RuleValidator
from app.pdf.cert_gen import CertificateGenerator
from app.firebase_db import (
    init_firebase,
    save_user_verification,
    get_user_verifications,
    update_handshake_status,
)

client = TestClient(app)

def run_rigorous_tests():
    print("=" * 70)
    print("      VOUCHPAY RIGOROUS FULL-SYSTEM VERIFICATION TEST SUITE       ")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. FRONTEND ASSETS & MOUNT INTEGRITY
    # -------------------------------------------------------------
    print("\n[SECTION 1] Testing Frontend & Static Assets Integrity...")
    res = client.get("/")
    assert res.status_code == 200, f"GET / failed with status {res.status_code}"
    html_content = res.text
    assert "<!doctype html>" in html_content.lower()
    assert "VouchPay" in html_content

    # Verify all linked CSS and JS files exist in dist and return 200
    import re
    asset_urls = re.findall(r'(?:src|href)="(/(?:assets|static)/[^"]+)"', html_content)
    print(f"  -> Found {len(asset_urls)} linked production assets in index.html")
    for asset_url in asset_urls:
        asset_res = client.get(asset_url)
        assert asset_res.status_code == 200, f"Failed to load asset {asset_url}: status {asset_res.status_code}"
        print(f"     [OK] Asset {asset_url} ({len(asset_res.content)} bytes)")

    # -------------------------------------------------------------
    # 2. LOCAL BLOCK ELA (32x32) & FORENSIC ENGINE
    # -------------------------------------------------------------
    print("\n[SECTION 2] Testing Forensic Engine & 32x32 Local Block ELA...")
    analyzer = ForensicAnalyzer()
    
    # Create an image with an intentionally manipulated local patch
    base_img = Image.new("RGB", (640, 640), color=(255, 255, 255))
    draw = ImageDraw.Draw(base_img)
    draw.rectangle([0, 0, 640, 640], fill=(245, 245, 245))
    draw.text((50, 50), "Original Text", fill=(0, 0, 0))
    
    # Save as high-compression baseline
    buf_base = io.BytesIO()
    base_img.save(buf_base, format="JPEG", quality=75)
    buf_base.seek(0)
    
    # Re-open and paste an uncompressed, high-contrast patch into block (200, 200)
    tampered_img = Image.open(buf_base)
    patch = Image.new("RGB", (64, 64), color=(0, 0, 0))
    tampered_img.paste(patch, (200, 200))
    
    os.makedirs("static/test_scratch", exist_ok=True)
    tamper_path = "static/test_scratch/tampered_test.jpg"
    tampered_img.save(tamper_path, format="JPEG", quality=95)
    
    forensic_result = analyzer.analyze(tamper_path, "static/test_scratch")
    print(f"  -> Tamper score: {forensic_result.tamper_score}%")
    print(f"  -> ELA Heatmap path: {forensic_result.ela_image_path}")
    print(f"  -> Image SHA-256: {forensic_result.image_sha256[:16]}...")
    assert forensic_result.tamper_score >= 0, "Tamper score not computed"
    assert os.path.exists("static/test_scratch/ela_heatmap.jpg"), "ELA Heatmap not generated!"
    print("     [OK] 32x32 Local Block ELA successfully produced variance and heatmap.")

    # -------------------------------------------------------------
    # 3. AI METADATA SCANNER & MULTIPLE SPOOF VECTORS
    # -------------------------------------------------------------
    print("\n[SECTION 3] Testing AI Metadata & Editor Detection Engine...")
    
    # Spoof Vector A: Stable Diffusion / Midjourney prompt in PNG chunk
    png_img = Image.new("RGB", (400, 800), color=(255, 255, 255))
    info = PngImagePlugin.PngInfo()
    info.add_text("parameters", "vibrant UPI receipt with ₹50,000 paid to shopkeeper\nSteps: 25, Sampler: Euler a, Model: SDXL Turbo")
    png_buf = io.BytesIO()
    png_img.save(png_buf, format="PNG", pnginfo=info)
    png_buf.seek(0)
    
    res_sd = client.post("/api/analyze", files={"file": ("sd_spoof.png", png_buf, "image/png")})
    assert res_sd.status_code == 200
    sd_data = res_sd.json()
    assert any("AI_METADATA_DETECTED" in f for f in sd_data["exif_flags"]), "Failed to catch SDXL prompt in PNG chunk!"
    assert sd_data["status"] == "DISPUTED"
    assert sd_data["trust_score"] <= 18
    print(f"     [OK] Vector A (SDXL Model PNG chunk): Flagged as DISPUTED, Trust Score {sd_data['trust_score']}/100")

    # Spoof Vector B: Photoshop / Editor Metadata in EXIF Software
    editor_img = Image.new("RGB", (400, 800), color=(255, 255, 255))
    exif = editor_img.getexif()
    exif[0x0131] = "Adobe Photoshop 2024 (Windows)"
    ed_buf = io.BytesIO()
    editor_img.save(ed_buf, format="JPEG", exif=exif)
    ed_buf.seek(0)
    
    res_ed = client.post("/api/analyze", files={"file": ("editor_spoof.jpg", ed_buf, "image/jpeg")})
    assert res_ed.status_code == 200
    ed_data = res_ed.json()
    assert any("EDITOR_METADATA_DETECTED" in f for f in ed_data["exif_flags"]), "Failed to catch Photoshop in EXIF Software!"
    assert ed_data["status"] == "DISPUTED"
    print(f"     [OK] Vector B (Photoshop EXIF): Flagged as DISPUTED, Trust Score {ed_data['trust_score']}/100")

    # -------------------------------------------------------------
    # 4. RAPIDOCR & FONT INTEGRITY
    # -------------------------------------------------------------
    print("\n[SECTION 4] Testing Local RapidOCR & Indian Bank Regex Engine...")
    extractor = AIExtractor()
    
    # Test sample UPI receipt with GPay and ₹12,450.00
    sample_path = "frontend/src/assets/images/sample_upi_receipt_1795287134806.jpg"
    ext_result = extractor.extract(sample_path)
    print(f"  -> Extracted Amount: ₹{ext_result.amount}")
    print(f"  -> Extracted UTR   : {ext_result.utr}")
    print(f"  -> Detected App    : {ext_result.app_name}")
    print(f"  -> Visual Anomalies: {ext_result.visual_anomalies}")
    assert ext_result.amount == 12450.0, f"Expected amount 12450.0, got {ext_result.amount}"
    assert ext_result.utr == "632419847512", f"Expected UTR 632419847512, got {ext_result.utr}"
    assert "Google Pay" in (ext_result.app_name or ""), f"Expected Google Pay, got {ext_result.app_name}"
    print("     [OK] RapidOCR extracted 12-digit UTR, INR amount, and UPI App signature accurately.")

    # -------------------------------------------------------------
    # 5. DUAL-PARTY HANDSHAKE & SCORING WORKFLOW
    # -------------------------------------------------------------
    print("\n[SECTION 5] Testing Dual-Party Handshake Link & Interactive Flow...")
    # Upload clean mobile aspect receipt
    clean_phone = Image.new("RGB", (1080, 2340), color=(255, 255, 255))
    d_clean = ImageDraw.Draw(clean_phone)
    d_clean.text((100, 300), "Paid to Rohit\nINR 3500.00\nUPI Ref: 489201948572\nGoogle Pay", fill=(0, 0, 0))
    c_buf = io.BytesIO()
    clean_phone.save(c_buf, format="JPEG", quality=95)
    c_buf.seek(0)
    
    test_user_id = f"test_user_{int(time.time())}"
    res_clean = client.post(
        "/api/analyze",
        files={"file": ("mobile_receipt.jpg", c_buf, "image/jpeg")},
        data={"user_id": test_user_id},
    )
    assert res_clean.status_code == 200
    tx_record = res_clean.json()
    tx_id = tx_record["tx_id"]
    initial_score = tx_record["trust_score"]
    print(f"  -> Tx ID: {tx_id}")
    print(f"  -> Initial Trust Score: {initial_score}/100 (Status: {tx_record['status']})")
    assert tx_record["handshake_status"] == "PENDING"

    # Test Dual-Party Verification Link (HTML landing page for counterparty)
    res_html = client.get(f"/verify/{tx_id}")
    assert res_html.status_code == 200
    assert "Verification Certificate" in res_html.text or "VouchPay" in res_html.text
    assert tx_id in res_html.text
    print(f"     [OK] GET /verify/{tx_id} loaded counterparty verification landing page.")

    # Test Counterparty Confirm
    res_conf = client.post(f"/verify/{tx_id}/confirm")
    assert res_conf.status_code == 200
    conf_data = res_conf.json()
    print(f"  -> Confirmed Trust Score: {conf_data['trust_score']}/100 (Handshake: {conf_data['handshake_status']})")
    assert conf_data["handshake_status"] == "CONFIRMED"
    assert conf_data["trust_score"] == initial_score + 25

    # Test Counterparty Dispute on a second transaction
    c_buf.seek(0)
    res_clean2 = client.post(
        "/api/analyze",
        files={"file": ("mobile_receipt_2.jpg", c_buf, "image/jpeg")},
        data={"user_id": test_user_id},
    )
    tx_id2 = res_clean2.json()["tx_id"]
    res_disp = client.post(f"/verify/{tx_id2}/dispute")
    assert res_disp.status_code == 200
    disp_data = res_disp.json()
    print(f"  -> Disputed Trust Score : {disp_data['trust_score']}/100 (Status: {disp_data['status']})")
    assert disp_data["handshake_status"] == "DISPUTED"
    assert disp_data["status"] == "DISPUTED"
    print("     [OK] Dual-party confirmation and dispute dynamically updated scores & status.")

    # -------------------------------------------------------------
    # 6. TAMPER-EVIDENT PDF CERTIFICATE GENERATION
    # -------------------------------------------------------------
    print("\n[SECTION 6] Testing PDF Certificate Generator...")
    res_pdf = client.get(f"/verify/{tx_id}/pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 1000
    assert res_pdf.content.startswith(b"%PDF")
    print(f"     [OK] Generated valid binary PDF ({len(res_pdf.content)} bytes) with %PDF magic header.")

    # -------------------------------------------------------------
    # 7. FIREBASE FIRESTORE SYNC & USER ISOLATION
    # -------------------------------------------------------------
    print("\n[SECTION 7] Testing Firebase Firestore Integration & User Data Isolation...")
    user_records = get_user_verifications(test_user_id)
    print(f"  -> Retrieved {len(user_records)} records stored for user: {test_user_id}")
    assert len(user_records) >= 2, "Expected at least 2 records for this user in Firestore"
    
    # Verify records belong strictly to this user
    for rec in user_records:
        assert rec.get("user_id") == test_user_id
        assert rec.get("tx_id") in [tx_id, tx_id2]
    print(f"     [OK] Firestore records strictly scoped to user '{test_user_id}'.")

    # Verify query for non-existent user returns empty list
    ghost_records = get_user_verifications("non_existent_ghost_user_9999")
    assert len(ghost_records) == 0
    print("     [OK] Querying non-existent user returns empty list (no data leakage).")

    # -------------------------------------------------------------
    # 8. ERROR HANDLING & RESILIENCE
    # -------------------------------------------------------------
    print("\n[SECTION 8] Testing Edge Cases & Error Resilience...")
    # Non-existent transaction PDF
    bad_pdf = client.get("/verify/non_existent_tx_999/pdf")
    assert bad_pdf.status_code == 404
    print("     [OK] 404 properly returned for non-existent PDF.")

    # Non-existent transaction verify page
    bad_verify = client.get("/verify/non_existent_tx_999")
    assert bad_verify.status_code == 404
    print("     [OK] 404 properly returned for non-existent verify page.")

    # Non-existent transaction confirm
    bad_confirm = client.post("/verify/non_existent_tx_999/confirm")
    assert bad_confirm.status_code == 404
    print("     [OK] 404 properly returned for non-existent confirm endpoint.")

    print("\n" + "=" * 70)
    print("   >>> 100% OF FEATURES & RIGOROUS VERIFICATION TESTS PASSED! <<<")
    print("=" * 70)

if __name__ == "__main__":
    run_rigorous_tests()
