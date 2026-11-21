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
