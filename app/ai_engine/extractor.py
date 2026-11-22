"""
VouchPay — Universal UPI OCR & Font Forensic Engine
- Universal UPI App Detection (Google Pay, PhonePe, Paytm, BHIM, CRED, Bank Apps, NPCI)
- Deterministic Font Mismatch Detection using OpenCV:
  * Stroke weight / thickness disparity
  * Character height disparity
  * Baseline horizontal misalignment
  * Character RGB color inconsistency
  * Edge sharpness / Laplacian variance divergence
- 100% Free, local, CPU-friendly (RapidOCR + OpenCV)
Parameter Weight: 25% of Trust Score
"""

import math
import os
import re
import cv2
import numpy as np
from datetime import datetime
from app.schemas import AIExtractionResult

_OCR_ENGINE = None

def get_ocr_engine():
    global _OCR_ENGINE
    if _OCR_ENGINE is None:
        from rapidocr_onnxruntime import RapidOCR
        _OCR_ENGINE = RapidOCR()
    return _OCR_ENGINE


class OCRExtractor:
    """Extracts UPI data and performs OpenCV font forensics on screenshots."""

    # Comprehensive UPI apps and banking apps in India
    APP_PATTERNS = {
        "Google Pay": [r"\bgoogle\s*pay\b", r"\bgpay\b", r"\btez\b"],
        "PhonePe": [r"\bphonepe\b", r"\bphone\s*pe\b"],
        "Paytm": [r"\bpaytm\b", r"\bpay\s*tm\b", r"\bpaytm\s*payments\s*bank\b"],
        "BHIM UPI": [r"\bbhim\b", r"\bbhim\s*upi\b", r"\bnpci\s*bhim\b"],
        "CRED": [r"\bcred\b", r"\bcred\s*pay\b"],
        "Amazon Pay": [r"\bamazon\s*pay\b", r"\bamazon\s*upi\b"],
        "MobiKwik": [r"\bmobikwik\b", r"\bmobi\s*kwik\b"],
        "WhatsApp Pay": [r"\bwhatsapp\b", r"\bwhatsapp\s*pay\b"],
        "Navi UPI": [r"\bnavi\b", r"\bnavi\s*upi\b"],
        "Slice": [r"\bslice\b", r"\bslice\s*pay\b"],
        "Super.money": [r"super\.money", r"\bsuper\s*money\b"],
        "Bajaj Finserv": [r"\bbajaj\s*finserv\b", r"\bbajaj\s*pay\b"],
        "Fi Money": [r"\bfi\s*money\b", r"\bfi\s*pay\b"],
        "Jupiter Money": [r"\bjupiter\s*money\b", r"\bjupiter\b"],
        "Tata Neu": [r"\btata\s*neu\b", r"\btata\s*pay\b"],
        "FamPay": [r"\bfampay\b", r"\bfam\s*pay\b"],
        "SBI YONO": [r"\byono\b", r"\bstate\s*bank\s*of\s*india\b", r"\bsbi\b"],
        "HDFC PayZapp": [r"\bpayzapp\b", r"\bhdfc\s*bank\b", r"\bhdfc\s*mobile\b"],
        "ICICI iMobile": [r"\bimobile\b", r"\bicici\s*bank\b", r"\bpockets\s*by\s*icici\b"],
        "Kotak 811": [r"\bkotak\s*811\b", r"\bkotak\s*bank\b", r"\bkotak\s*mahindra\b"],
        "Axis Mobile": [r"\baxis\s*mobile\b", r"\baxis\s*bank\b", r"\bfreecharge\b"],
        "PNB One": [r"\bpnb\s*one\b", r"\bpunjab\s*national\s*bank\b"],
        "Canara ai1": [r"\bcanara\s*ai1\b", r"\bcanara\s*bank\b"],
        "bob World": [r"\bbob\s*world\b", r"\bbank\s*of\s*baroda\b"],
        "Union Vyom": [r"\bunion\s*vyom\b", r"\bunion\s*bank\b"],
        "IDFC FIRST": [r"\bidfc\s*first\b", r"\bidfc\s*bank\b"],
        "IndusInd Bank": [r"\bindusind\b", r"\bindusmobile\b"],
        "Yes Bank": [r"\byes\s*bank\b", r"\byes\s*pay\b"],
        "Federal FedMobile": [r"\bfedmobile\b", r"\bfederal\s*bank\b"],
    }

    # Known VPA handles mapped to provider
    VPA_HANDLES = {
        r"@okaxis": "Google Pay (Axis)",
        r"@okhdfcbank": "Google Pay (HDFC)",
        r"@okicici": "Google Pay (ICICI)",
        r"@oksbi": "Google Pay (SBI)",
        r"@ybl": "PhonePe (YES Bank)",
        r"@ibl": "PhonePe (ICICI)",
        r"@axl": "PhonePe (Axis)",
        r"@paytm": "Paytm",
        r"@upi": "BHIM UPI",
        r"@apl": "Amazon Pay",
        r"@rapi": "Amazon Pay (RBL)",
        r"@sbi": "SBI UPI",
        r"@hdfcbank": "HDFC Bank UPI",
        r"@icici": "ICICI Bank UPI",
        r"@kotak": "Kotak Bank UPI",
        r"@axisbank": "Axis Bank UPI",
        r"@barodampay": "Bank of Baroda UPI",
        r"@postbank": "India Post Payments Bank",
    }

    MONTHS = {
        "jan": "01", "feb": "02", "mar": "03", "apr": "04",
        "may": "05", "jun": "06", "jul": "07", "aug": "08",
        "sep": "09", "oct": "10", "nov": "11", "dec": "12"
    }

    def __init__(self):
        self.engine = get_ocr_engine()

    def extract(self, image_path: str) -> AIExtractionResult:
        if not os.path.exists(image_path):
            return AIExtractionResult(visual_anomalies=["IMAGE_NOT_FOUND"])

        try:
            results, elapse = self.engine(image_path)
        except Exception as e:
            return AIExtractionResult(
                visual_anomalies=[f"OCR_ENGINE_ERROR: {str(e)}"]
            )

        if not results:
            return AIExtractionResult(
                visual_anomalies=["NO_TEXT_DETECTED: Screenshot appears unreadable"]
            )

        full_text = " ".join([item[1] for item in results])

        # 1. Structured Data Extraction
        amount, amount_conf, amount_box = self._extract_amount(results)
        utr, utr_conf, utr_box = self._extract_utr(results)
        receipt_date = self._extract_date(full_text)
        receipt_time = self._extract_time(full_text)
        app_name = self._extract_app(full_text)

        # 2. Advanced OpenCV Font & Layout Mismatch Analysis
        visual_anomalies = self._analyze_font_and_layout(
            image_path, results, amount, amount_conf, amount_box, utr, utr_conf, utr_box
        )

        return AIExtractionResult(
            amount=amount,
            utr=utr,
            receipt_date=receipt_date,
            receipt_time=receipt_time,
            app_name=app_name,
            visual_anomalies=visual_anomalies,
        )

    # ------------------------------------------------------------- Amount
    def _extract_amount(self, items):
        amount_patterns = [
            re.compile(r"(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)", re.IGNORECASE),
            re.compile(r"paid\s*(?:to\s*[^0-9]+)?(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)", re.IGNORECASE),
            re.compile(r"\b([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?)\b"),
            re.compile(r"^\s*([0-9]+(?:\.[0-9]{2})?)\s*$"),
        ]

        for bbox, text, score in items:
            for pat in amount_patterns:
                m = pat.search(text)
                if m:
                    raw_val = m.group(1).replace(",", "")
                    try:
                        val = float(raw_val)
                        if 1.0 <= val <= 200000.0:
                            return val, score, bbox
                    except ValueError:
                        continue

        for idx, (bbox, text, score) in enumerate(items):
            if re.search(r"\b(amount|paid|total|sent|debited)\b", text, re.IGNORECASE):
                if idx + 1 < len(items):
                    n_bbox, n_text, n_score = items[idx + 1]
                    m = re.search(r"([0-9,]+(?:\.[0-9]{1,2})?)", n_text)
                    if m:
                        try:
                            val = float(m.group(1).replace(",", ""))
                            if 1.0 <= val <= 200000.0:
                                return val, n_score, n_bbox
                        except ValueError:
                            pass

        return None, 0.0, None

    # ------------------------------------------------------------- UTR
    def _extract_utr(self, items):
        utr_regex = re.compile(r"\b(\d{12})\b")

        # Check with explicit keywords first
        for bbox, text, score in items:
            if re.search(r"(?:utr|ref|rrn|txn|trans|upi\s*ref|bank\s*ref|order\s*id)", text, re.IGNORECASE):
                m = utr_regex.search(text)
                if m:
                    return m.group(1), score, bbox

        # Check adjacent row after label
        for idx, (bbox, text, score) in enumerate(items):
            if re.search(r"(?:utr|ref|transaction\s*id|txn\s*id|rrn|reference\s*no)", text, re.IGNORECASE):
                if idx + 1 < len(items):
                    n_bbox, n_text, n_score = items[idx + 1]
                    m = utr_regex.search(n_text)
                    if m:
                        return m.group(1), n_score, n_bbox

        # Standalone 12-digit number
        for bbox, text, score in items:
            m = utr_regex.search(text)
            if m:
                return m.group(1), score, bbox

        # Non-standard length near UTR label (tampered/clipped UTR)
        for bbox, text, score in items:
            if re.search(r"(?:utr|ref|transaction\s*id)", text, re.IGNORECASE):
                num_m = re.search(r"\b(\d{8,14})\b", text)
                if num_m:
                    return num_m.group(1), score, bbox

        return None, 0.0, None

    # ------------------------------------------------------------- Date
    def _extract_date(self, text: str) -> str | None:
        p1 = re.search(r"\b(\d{1,2})[\s\-]+([A-Za-z]{3,9})[\s,]+(\d{4})\b", text)
        if p1:
            day, mon, year = p1.group(1).zfill(2), p1.group(2)[:3].lower(), p1.group(3)
            mon_num = self.MONTHS.get(mon)
            if mon_num:
                return f"{year}-{mon_num}-{day}"

        p2 = re.search(r"\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b", text)
        if p2:
            return f"{p2.group(3)}-{p2.group(2).zfill(2)}-{p2.group(1).zfill(2)}"

        p3 = re.search(r"\b(\d{4})[\/\-](\d{2})[\/\-](\d{2})\b", text)
        if p3:
            return f"{p3.group(1)}-{p3.group(2)}-{p3.group(3)}"

        return None

    # ------------------------------------------------------------- Time
    def _extract_time(self, text: str) -> str | None:
        tm = re.search(r"\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?\b", text)
        if tm:
            hh = int(tm.group(1))
            mm = tm.group(2)
            ss = tm.group(3) or "00"
            meridiem = tm.group(4)
            if meridiem:
                if meridiem.upper() == "PM" and hh < 12:
                    hh += 12
                elif meridiem.upper() == "AM" and hh == 12:
                    hh = 0
            return f"{str(hh).zfill(2)}:{mm}:{ss}"
        return None

    # ------------------------------------------------------------- Universal App & VPA
    def _extract_app(self, text: str) -> str:
        text_lower = text.lower()

        # 1. Match specific VPA handles first (e.g. user@okaxis, user@ybl)
        for handle_pat, provider in self.VPA_HANDLES.items():
            if re.search(handle_pat, text_lower):
                return provider

        # 2. Match specific app brands
        for app_name, patterns in self.APP_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, text_lower):
                    return app_name

        # 3. Match generic VPA pattern (@bankname)
        vpa_match = re.search(r"[\w\.\-]+@([a-zA-Z0-9]+)", text)
        if vpa_match:
            bank_handle = vpa_match.group(1).upper()
            return f"UPI (@{bank_handle})"

        # 4. Generic UPI keywords
        if any(w in text_lower for w in ["upi", "unified payments", "npci", "bank transfer", "paid to"]):
            return "UPI Payment (Standard Bank/Merchant)"

        return "Generic UPI Receipt"

    # ------------------------------------------------------------- OpenCV Font Mismatch & Layout Forensics
    def _analyze_font_and_layout(
        self, image_path: str, items, amount, amount_conf, amount_box, utr, utr_conf, utr_box
    ) -> list[str]:
        anomalies = []

        scores = [item[2] for item in items]
        avg_score = sum(scores) / len(scores) if scores else 0.0

        # Field completeness
        if amount is None:
            anomalies.append("OCR_MISSING_AMOUNT: Transaction amount could not be read clearly")
        if utr is None:
            anomalies.append("OCR_MISSING_UTR: 12-digit UPI UTR/RRN number not detected")

        # Confidence drops (indicates smudge, re-compression or low-quality paste)
        if amount and amount_box and amount_conf < 0.70 and avg_score > 0.85:
            anomalies.append(
                f"OCR_CONFIDENCE_LOW_AMOUNT: Amount text confidence ({int(amount_conf*100)}%) is abnormally lower than receipt average"
            )
        if utr and utr_box and utr_conf < 0.70 and avg_score > 0.85:
            anomalies.append(
                f"OCR_CONFIDENCE_LOW_UTR: UTR text confidence ({int(utr_conf*100)}%) is abnormally lower than receipt average"
            )

        # OpenCV Deep Font Analysis on the Amount region
        if amount_box and os.path.exists(image_path):
            try:
                cv_img = cv2.imread(image_path)
                if cv_img is not None:
                    # Crop amount box with slight padding
                    pts = np.array(amount_box, dtype=np.int32)
                    x, y, w, h = cv2.boundingRect(pts)
                    img_h, img_w = cv_img.shape[:2]
                    
                    pad = 4
                    x1 = max(0, x - pad)
                    y1 = max(0, y - pad)
                    x2 = min(img_w, x + w + pad)
                    y2 = min(img_h, y + h + pad)

                    if (x2 - x1) > 10 and (y2 - y1) > 8:
                        amount_crop = cv_img[y1:y2, x1:x2]
                        font_flags = self._inspect_character_fonts(amount_crop)
                        anomalies.extend(font_flags)

                        # Edge Sharpness Divergence: compare amount crop vs background / header
                        edge_flags = self._inspect_edge_sharpness(cv_img, amount_crop, items)
                        anomalies.extend(edge_flags)
            except Exception:
                pass

        return anomalies

    def _inspect_character_fonts(self, crop_bgr: np.ndarray) -> list[str]:
        """Detects font-weight disparity, digit height variance, baseline misalignment, and color inconsistencies."""
        flags = []
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)

        # Otsu thresholding to segment text characters
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Find individual character contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        char_boxes = []
        min_char_h = max(5, int(crop_bgr.shape[0] * 0.10))

        for c in contours:
            bx, by, bw, bh = cv2.boundingRect(c)
            # Filter noise and dots
            if bh >= min_char_h and bw >= 2:
                sub_thresh = thresh[by:by+bh, bx:bx+bw]
                sub_crop = crop_bgr[by:by+bh, bx:bx+bw]
                stroke_pixels = sub_crop[sub_thresh == 255]
                
                if len(stroke_pixels) > 0:
                    density = len(stroke_pixels) / (bw * bh)
                    mean_color = stroke_pixels.mean(axis=0)

                    char_boxes.append({
                        "x": bx, "y": by, "w": bw, "h": bh,
                        "baseline": by + bh,
                        "density": density,
                        "color": mean_color
                    })

        # Require at least 3 character glyphs (e.g., "500" or "₹50")
        if len(char_boxes) >= 3:
            char_boxes.sort(key=lambda b: b["x"])

            # If there are 4+ boxes and the first box is a symbol (₹ or R), analyze digits
            boxes_to_check = char_boxes[1:] if len(char_boxes) >= 4 else char_boxes

            # 1. Height Disparity Check
            heights = [b["h"] for b in boxes_to_check]
            median_h = float(np.median(heights))
            if median_h > 0:
                max_h_diff = max(abs(h - median_h) for h in heights)
                if max_h_diff / median_h > 0.40:
                    flags.append(
                        f"FONT_HEIGHT_MISMATCH: Digit height variation ({int(max_h_diff/median_h*100)}%) detected in amount text (possible pasted digits)"
                    )

            # 2. Baseline Misalignment Check
            baselines = [b["baseline"] for b in boxes_to_check]
            baseline_std = float(np.std(baselines))
            if median_h > 0 and (baseline_std / median_h) > 0.25:
                flags.append(
                    f"BASELINE_MISALIGNMENT: Vertical character baseline jitter ({baseline_std:.1f}px) in amount field"
                )

            # 3. Stroke Weight / Density Disparity Check
            densities = [b["density"] for b in boxes_to_check]
            median_d = float(np.median(densities))
            if median_d > 0:
                max_d_diff = max(abs(d - median_d) for d in densities)
                if max_d_diff / median_d > 0.60:
                    flags.append(
                        "FONT_WEIGHT_MISMATCH: Stroke thickness/weight disparity detected across amount digits"
                    )

            # 4. Color / Luminance Uniformity Check
            colors = np.array([b["color"] for b in boxes_to_check])
            median_color = np.median(colors, axis=0)
            color_distances = [np.linalg.norm(c - median_color) for c in colors]
            if max(color_distances) > 55.0:
                flags.append(
                    "FONT_COLOR_DISCREPANCY: Visible color tone or luminance disparity among amount characters"
                )

        return flags

    def _inspect_edge_sharpness(self, full_img: np.ndarray, amount_crop: np.ndarray, items) -> list[str]:
        """Compares Laplacian edge variance of amount crop against other text regions to flag pasted patches."""
        flags = []
        try:
            gray_amount = cv2.cvtColor(amount_crop, cv2.COLOR_BGR2GRAY)
            amount_var = cv2.Laplacian(gray_amount, cv2.CV_64F).var()

            # Find a reference text block from items not overlapping amount
            ref_vars = []
            for bbox, text, score in items[:4]:
                if len(text.strip()) > 5:
                    pts = np.array(bbox, dtype=np.int32)
                    rx, ry, rw, rh = cv2.boundingRect(pts)
                    if rw > 20 and rh > 10:
                        crop = full_img[max(0, ry):min(full_img.shape[0], ry+rh), max(0, rx):min(full_img.shape[1], rx+rw)]
                        if crop.size > 0:
                            gc = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
                            ref_vars.append(cv2.Laplacian(gc, cv2.CV_64F).var())

            if ref_vars:
                median_ref = float(np.median(ref_vars))
                # If amount variance is abnormally sharper or blurrier than the rest of the text (> 4x or < 0.25x)
                if median_ref > 50:
                    ratio = amount_var / median_ref
                    if ratio > 4.5:
                        flags.append(f"EDGE_SHARPNESS_DISPARITY: Amount area has unnaturally sharp edges ({ratio:.1f}x reference) indicative of pasted text")
                    elif ratio < 0.22:
                        flags.append(f"EDGE_BLUR_DISPARITY: Amount area exhibits abnormal compression blur ({ratio:.2f}x reference)")
        except Exception:
            pass

        return flags


AIExtractor = OCRExtractor
