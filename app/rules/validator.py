"""
VouchPay — Universal UPI Rule-Based Validator
Validates extracted payment data across any UPI provider,
AI generation provenance alerts, metadata flags, UTR structure, and business rules.
Parameter Weight: 20% of Trust Score
"""

import re
from datetime import datetime, timedelta
from app.schemas import ForensicResult, AIExtractionResult


class RuleValidator:
    """Universal deterministic integrity validator."""

    UTR_PATTERN = re.compile(r"^\d{12}$")

    def validate(
        self,
        forensics: ForensicResult,
        extraction: AIExtractionResult,
    ) -> list[str]:
        flags: list[str] = []
        flags.extend(self._check_ai_and_editor_metadata(forensics.exif_flags))
        flags.extend(self._check_utr(extraction.utr))
        flags.extend(self._check_timestamp(extraction.receipt_date, extraction.receipt_time))
        flags.extend(self._check_amount(extraction.amount))
        flags.extend(self._check_app(extraction.app_name))
        flags.extend(self._check_tamper(forensics.tamper_score))
        return flags

    # ------------------------------------------------------------- AI & Editor Provenance
    @staticmethod
    def _check_ai_and_editor_metadata(metadata_flags: list[str]) -> list[str]:
        flags = []
        for f in metadata_flags:
            if "AI_METADATA_DETECTED" in f:
                flags.append(f"AI_SPOOF_ALERT: {f}")
            elif "EDITOR_METADATA_DETECTED" in f:
                flags.append(f"EDITOR_SPOOF_ALERT: {f}")
            elif "SCREENSHOT_ASPECT_RATIO" in f or "SCREENSHOT_ORIENTATION" in f:
                flags.append(f"LAYOUT_ANOMALY: {f}")
            elif "ICC_PROFILE" in f:
                flags.append(f"COLOR_PROFILE_ALERT: {f}")
        return flags

    # ------------------------------------------------------------- UTR
    def _check_utr(self, utr: str | None) -> list[str]:
        if utr is None:
            return ["UTR_MISSING: No 12-digit UPI UTR number detected"]
        if not self.UTR_PATTERN.match(str(utr)):
            return [f"UTR_INVALID_FORMAT: '{utr}' does not match standard 12-digit UPI format"]
        return []

    # ------------------------------------------------------------- Timestamp
    def _check_timestamp(self, date_s: str | None, time_s: str | None) -> list[str]:
        flags: list[str] = []
        if date_s is None:
            return ["DATE_MISSING: No transaction date detected"]
        try:
            fmt = "%Y-%m-%d %H:%M:%S" if time_s else "%Y-%m-%d"
            raw = f"{date_s} {time_s}" if time_s else date_s
            dt = datetime.strptime(raw, fmt)
            now = datetime.now()
            if dt > now + timedelta(minutes=10):
                flags.append(f"FUTURE_TIMESTAMP: Transaction timestamp ({dt}) is ahead of current server time")
            elif dt < now - timedelta(days=90):
                flags.append(f"STALE_RECEIPT: Transaction date ({date_s}) is older than 90 days")
        except ValueError:
            flags.append(f"TIMESTAMP_PARSE_ERROR: date='{date_s}' time='{time_s}'")
        return flags

    # ------------------------------------------------------------- Amount
    @staticmethod
    def _check_amount(amount: float | None) -> list[str]:
        if amount is None:
            return ["AMOUNT_MISSING: No transaction amount detected"]
        if amount <= 0:
            return [f"AMOUNT_INVALID: ₹{amount} is non-positive"]
        if amount > 100_000:
            return [f"AMOUNT_HIGH: ₹{amount} exceeds standard UPI single-transaction limit (₹1,00,000)"]
        return []

    # ------------------------------------------------------------- Universal App Check
    def _check_app(self, app: str | None) -> list[str]:
        if app is None or not app.strip():
            return ["APP_UNSPECIFIED: Could not identify UPI application or bank handle"]
        return []

    # ------------------------------------------------------------- Tamper Score
    @staticmethod
    def _check_tamper(score: float) -> list[str]:
        if score > 50.0:
            return [f"HIGH_ELA_TAMPER_SCORE: Pixel ELA tamper score is {score:.1f}% (localized editing detected)"]
        return []
