from pydantic import BaseModel
from typing import List, Optional

class ForensicResult(BaseModel):
    ela_image_path: str
    tamper_score: float          # 0.0 (clean) to 100.0 (heavily edited)
    exif_flags: List[str]
    image_sha256: str

class AIExtractionResult(BaseModel):
    amount: Optional[float] = None
    utr: Optional[str] = None
    receipt_date: Optional[str] = None  # YYYY-MM-DD
    receipt_time: Optional[str] = None
    app_name: Optional[str] = None      # GPay, PhonePe, Paytm
    visual_anomalies: List[str] = []

class VerificationRecord(BaseModel):
    tx_id: str
    status: str                  # PENDING, CONFIRMED, DISPUTED
    trust_score: int             # 0 to 100
    forensics: ForensicResult
    extraction: AIExtractionResult
    rule_flags: List[str]
    created_at: str
