import os
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, PngImagePlugin
import io
from app.main import app

client = TestClient(app)

def run_suite():
    print("=================================================================")
    print("         VOUCHPAY FORENSIC & FIREBASE VERIFICATION SUITE         ")
    print("=================================================================")

    # Test 1: AI Modified Receipt (sample_upi_receipt_1795287134806.jpg)
    sample_path = "frontend/src/assets/images/sample_upi_receipt_1795287134806.jpg"
    assert os.path.exists(sample_path), f"Sample receipt not found at {sample_path}"

    with open(sample_path, "rb") as f:
        real_img_bytes = f.read()

    print("\n[TEST 1] Analyzing AI-Modified / Generative Expand Screenshot...")
    res_ai_sample = client.post(
        "/api/analyze",
        files={"file": ("sample_receipt.jpg", real_img_bytes, "image/jpeg")},
        data={"user_id": "test_google_ops_user"},
    )
    assert res_ai_sample.status_code == 200, f"Analysis failed: {res_ai_sample.text}"
    ai_sample_data = res_ai_sample.json()

    print(f"  -> Transaction ID: {ai_sample_data['tx_id']}")
    print(f"  -> Detected App  : {ai_sample_data['app_name']}")
    print(f"  -> Amount        : ₹{ai_sample_data['amount']}")
    print(f"  -> UTR / RRN     : {ai_sample_data['utr']}")
    print(f"  -> Trust Score   : {ai_sample_data['trust_score']}/100")
    print(f"  -> Status        : {ai_sample_data['status']}")
    print(f"  -> AI Flags      : {ai_sample_data['exif_flags']}")

    # Verification: Must catch C2PA, Adobe Generative Fill, and flag as DISPUTED with penalized score <= 18
    assert any("AI_METADATA_DETECTED" in f for f in ai_sample_data["exif_flags"]), "AI metadata flag missing!"
    assert ai_sample_data["status"] == "DISPUTED", f"Expected DISPUTED, got {ai_sample_data['status']}"
    assert ai_sample_data["trust_score"] <= 18, f"Score should be capped <= 18 for AI spoof, got {ai_sample_data['trust_score']}"
    print("  -> AI-Modified screenshot successfully caught and flagged as DISPUTED!")

    # Test 2: AI Generated Screenshot with PNG chunk prompt metadata (SDXL)
    print("\n[TEST 2] Analyzing PNG with Embedded AI Generation Model Prompts (SDXL)...")
    ai_img = Image.new("RGB", (600, 1000), color=(240, 240, 240))
    png_info = PngImagePlugin.PngInfo()
    png_info.add_text("parameters", "photorealistic UPI payment receipt, ultra detailed, 8k\nSteps: 30, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 198472918, Size: 600x1000, Model: SDXL_v1.0")

    ai_buf = io.BytesIO()
    ai_img.save(ai_buf, format="PNG", pnginfo=png_info)
    ai_buf.seek(0)

    res_ai_png = client.post(
        "/api/analyze",
        files={"file": ("ai_generated_receipt.png", ai_buf, "image/png")},
        data={"user_id": "test_google_ops_user"},
    )
    assert res_ai_png.status_code == 200
    ai_png_data = res_ai_png.json()

    print(f"  -> Transaction ID: {ai_png_data['tx_id']}")
    print(f"  -> Trust Score   : {ai_png_data['trust_score']}/100")
    print(f"  -> Status        : {ai_png_data['status']}")
    print(f"  -> EXIF/AI Flags : {ai_png_data['exif_flags']}")

    assert any("AI_METADATA_DETECTED" in f for f in ai_png_data["exif_flags"]), "AI metadata flag missing!"
    assert ai_png_data["status"] == "DISPUTED"
    print("  -> SDXL Model Prompts successfully caught in PNG metadata!")

    # Test 3: Genuine Mobile Phone Screenshot & Dual-Party Handshake Scoring
    print("\n[TEST 3] Testing Clean Mobile Receipt & Dual-Party Handshake Scoring...")
    clean_img = Image.new("RGB", (1080, 2400), color=(255, 255, 255))
    d = ImageDraw.Draw(clean_img)
    d.text((100, 400), "Paid to Merchant\nINR 1250.00\nUPI Ref: 498765432109\nGoogle Pay", fill=(0, 0, 0))

    clean_buf = io.BytesIO()
    clean_img.save(clean_buf, format="JPEG", quality=95)
    clean_buf.seek(0)

    res_clean = client.post(
        "/api/analyze",
        files={"file": ("clean_phone_receipt.jpg", clean_buf, "image/jpeg")},
        data={"user_id": "test_google_ops_user"},
    )
    assert res_clean.status_code == 200
    clean_data = res_clean.json()
    clean_tx_id = clean_data["tx_id"]

    print(f"  -> Initial Trust Score : {clean_data['trust_score']}/100 (Status: {clean_data['status']})")
    print(f"  -> Handshake Status    : {clean_data['handshake_status']}")

    # Counterparty Confirms
    res_confirm = client.post(f"/verify/{clean_tx_id}/confirm")
    assert res_confirm.status_code == 200
    confirmed = res_confirm.json()
    print(f"  -> Confirmed Trust Score: {confirmed['trust_score']}/100 (Status: {confirmed['status']})")
    assert confirmed["trust_score"] > clean_data["trust_score"]
    assert confirmed["handshake_status"] == "CONFIRMED"
    print("  -> Dual-Party Handshake confirmation successfully boosted trust score!")

    # Test 4: Download Official PDF Certificate
    print("\n[TEST 4] Downloading Official PDF Certificate...")
    res_pdf = client.get(f"/verify/{clean_tx_id}/pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    print(f"  -> PDF Certificate generated successfully ({len(res_pdf.content)} bytes)")

    # Test 5: User-Scoped Firestore Query
    print("\n[TEST 5] Querying User Records from Firestore / API...")
    res_user = client.get("/api/user/test_google_ops_user/verifications")
    assert res_user.status_code == 200
    user_txs = res_user.json()
    print(f"  -> Successfully retrieved {len(user_txs)} verifications for test_google_ops_user")
    assert len(user_txs) >= 3

    print("\n=================================================================")
    print("       ALL FORENSIC, METADATA & FIREBASE TESTS PASSED!          ")
    print("=================================================================")

if __name__ == "__main__":
    run_suite()
