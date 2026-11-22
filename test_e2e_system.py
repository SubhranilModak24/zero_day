from fastapi.testclient import TestClient
from app.main import app
import io
from PIL import Image

client = TestClient(app)

def test_full_flow():
    # 1. Test GET /
    res = client.get("/")
    print("GET / status:", res.status_code)
    assert res.status_code == 200
    assert "VouchPay" in res.text or "assets" in res.text or "vite" in res.text

    # 2. Test POST /api/analyze with user_id
    img = Image.new("RGB", (400, 700), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = client.post(
        "/api/analyze",
        files={"file": ("test_e2e.jpg", buf, "image/jpeg")},
        data={"user_id": "usr_google_12345"},
    )
    print("POST /api/analyze status:", res.status_code)
    assert res.status_code == 200
    data = res.json()
    tx_id = data["tx_id"]
    print(f"tx_id: {tx_id}")
    print(f"Initial Status: {data['status']}, Score: {data['trust_score']}")
    assert data["user_id"] == "usr_google_12345"

    # 3. Test GET /api/user/{user_id}/verifications
    res_user = client.get("/api/user/usr_google_12345/verifications")
    print("GET /api/user/... status:", res_user.status_code)
    assert res_user.status_code == 200
    user_records = res_user.json()
    print(f"User records count: {len(user_records)}")
    assert len(user_records) >= 1
    assert any(r["tx_id"] == tx_id for r in user_records)

    # 4. Test Handshake Confirm
    res_conf = client.post(f"/verify/{tx_id}/confirm")
    print("POST /confirm status:", res_conf.status_code)
    assert res_conf.status_code == 200
    conf_data = res_conf.json()
    print(f"Confirmed trust score: {conf_data['trust_score']} (Status: {conf_data['status']})")
    assert conf_data["handshake_status"] == "CONFIRMED"
    assert conf_data["trust_score"] > data["trust_score"]

    # 5. Test PDF certificate generation
    res_pdf = client.get(f"/verify/{tx_id}/pdf")
    print("GET /verify/{tx_id}/pdf status:", res_pdf.status_code)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"

    print("\n>>> ALL SYSTEM & USER DATA FLOWS ARE WORKING FLAWLESSLY! <<<")

if __name__ == "__main__":
    test_full_flow()
