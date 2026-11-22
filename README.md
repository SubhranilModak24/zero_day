<<<<<<< HEAD
# 🛡️ VouchPay — The Last-Mile Payment Verifier

**VouchPay** is a forensic payment verification platform built to protect gig workers, delivery partners, and freelancers from fake or edited UPI payment screenshots. It combines pixel-level image forensics, Vision AI auditing, mathematical UPI UTR decoding, and a dual-party confirmation handshake to generate a tamper-evident dispute certificate.

---

## 🚨 The Problem
Gig workers and freelancers frequently face payment fraud via doctored UPI screenshots or spoofed payment apps. Standard checks fail because messaging apps like WhatsApp strip image metadata, leaving workers with no fast way to spot a fake and no credible, timestamped evidence during a dispute.

---

## ⚙️ How It Works (100-Point Trust Score)

VouchPay evaluates every uploaded payment proof across **four weighted parameter layers**:

| Parameter | Weight | Signals Checked |
| :--- | :---: | :--- |
| **1. Pixel Forensics (ELA)** | **30%** | Error Level Analysis heatmap exposing edited/pasted regions (amounts, UTR numbers). |
| **2. AI Visual Audit (VLM)** | **25%** | Font-weight mismatches, misaligned digits, invalid `₹` symbols, and phone clock vs. receipt time contradictions. |
| **3. Rules & Metadata** | **20%** | 12-digit UPI UTR `YDDD` Julian-date math verification, duplicate UTR replay check, and EXIF scan for editing apps (Canva, Photoshop, PicsArt). |
| **4. Dual-Party Handshake** | **25%** | Unique, expiring verification link (`/verify/{tx_id}`) for the customer/merchant to confirm or dispute the transaction. |

* **80–100:** Safe / Verified
* **50–79:** Suspicious (Manual verification recommended)
* **Below 50:** High Tamper Risk

All results are locked with a **SHA-256 cryptographic hash** and exported as a shareable, timestamped **PDF Verification Certificate**.

---

## 🛠️ Tech Stack
* **Backend:** FastAPI, Uvicorn, SQLite, Pydantic
* **Image Forensics:** Pillow (ELA Heatmap, EXIF Metadata), `hashlib` (SHA-256)
* **AI Engine:** Google Gemini 2.5 Flash (Structured JSON Extraction & Visual Anomaly Detection)
* **Frontend:** HTML5, Jinja2 Templates, Tailwind CSS
* **Reporting:** ReportLab (PDF Verification Certificates)

---

## 📂 Project Structure

```text
vouchpay/
├── app/
│   ├── main.py                 # FastAPI routes, DB, /verify/{tx_id}
│   ├── schemas.py              # Shared Pydantic data models
│   ├── forensics/
│   │   └── analyzer.py         # ELA heatmap, EXIF scan, SHA-256 hash
│   ├── ai_engine/
│   │   └── extractor.py        # Vision LLM extraction & visual anomaly check
│   ├── rules/
│   │   └── validator.py        # 12-digit UTR YDDD decoder, SMS parser, Trust Score
│   ├── pdf/
│   │   └── cert_gen.py         # Timestamped PDF dispute certificate generator
│   └── templates/
│       ├── index.html          # Upload UI + Original vs. ELA heatmap viewer
│       └── verify.html         # Dual-party Confirm / Dispute page
├── static/                     # Uploaded proofs & generated ELA heatmaps
├── sample_data/                # Real vs. edited test UPI screenshots
├── .env.example                # Environment variable template
├── requirements.txt            # Python dependencies
└── README.md
=======
# VouchPay — The Last-Mile Verifier

> **Hackanovate 2.0 · Problem Statement 1**
> Gig workers & freelancers get cheated daily by fake/edited UPI payment screenshots. VouchPay is a 100% local, free Python-based forensic and OCR audit engine that verifies every uploaded payment proof and produces a 0–100 Trust Score with a timestamped, SHA-256-verified PDF certificate.
> **No paid APIs or external LLMs required.**

---

## 🏗️ Architecture

```
app/
├── main.py               # FastAPI routes & trust-score calculator
├── schemas.py             # Pydantic data models
├── forensics/
│   └── analyzer.py        # ELA heatmap · EXIF scan · SHA-256 hash
├── ai_engine/
│   └── extractor.py       # RapidOCR ONNX extraction & bounding-box audit
├── rules/
│   └── validator.py       # UTR format · timestamp · metadata rules
├── pdf/
│   └── cert_gen.py        # ReportLab PDF certificate generator
└── templates/
    ├── index.html          # Upload page (drag & drop)
    └── verify.html         # Verification results dashboard
```

## 📊 Trust Score (0–100) — 4 Parameters

| # | Parameter              | Weight | Signals                                                       |
|---|------------------------|--------|---------------------------------------------------------------|
| 1 | Pixel Forensics (ELA)  | 30 %   | Heatmap intensity on amount & UTR regions (PIL ImageChops)    |
| 2 | OCR & Visual Audit     | 25 %   | RapidOCR confidence, bounding box skew, missing fields audit   |
| 3 | Rules & Metadata       | 20 %   | 12-digit UTR check, EXIF editor scan, future-timestamp flag   |
| 4 | Dual-Party Handshake   | 25 %   | Confirm/dispute via unique `/verify/{id}` link                |

- **80–100** → ✅ Verified
- **50–79** → ⚠️ Suspicious
- **< 50** → ❌ High Tamper Risk

## 🚀 Quick Start

```bash
# 1. Create & activate virtual environment
python -m venv hack
hack\Scripts\activate        # Windows
# source hack/bin/activate   # Linux/Mac

# 2. Install dependencies (100% free, local)
pip install -r requirements.txt

# 3. Run
uvicorn app.main:app --reload --port 8000
```

Then open **http://localhost:8000** in your browser.

## 📦 Dependencies

- **FastAPI** + **Uvicorn** — web framework & ASGI server
- **RapidOCR-ONNXRuntime** + **OpenCV** — free local OCR & bounding box analysis
- **Pillow** — ELA image processing
- **ReportLab** — PDF certificate generation
- **python-dotenv** — environment configuration

## 👥 Team

Built for Hackanovate 2.0 — Sinu Main Fest
>>>>>>> 9c10521 (Add Firebase integration, frontend, and test suite)
