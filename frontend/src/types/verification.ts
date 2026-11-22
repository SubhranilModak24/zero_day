export type VerificationStatus = 'verified' | 'pending' | 'disputed';

export type ScreenRoute =
  | 'ledger'
  | 'verify'
  | 'disputes'
  | 'reconciliation';

export type BankName =
  | 'HDFC Bank'
  | 'ICICI Bank'
  | 'State Bank of India'
  | 'Axis Bank'
  | 'Kotak Mahindra'
  | 'Union Bank of India';

export type DisputeReason =
  | 'Screenshot Tampering'
  | 'RRN Mismatch'
  | 'Duplicate UTR'
  | 'Velocity Breach'
  | 'Timestamp Drift'
  | 'Manual Compliance Hold';

export interface ProofChainStep {
  id: string;
  label: string;
  detail: string;
  status: 'passed' | 'warning' | 'failed' | 'waiting';
  timestamp: string;
}

export interface AuditNote {
  id: string;
  author: string;
  timestamp: string;
  message: string;
  action?: string;
}

export interface UpiTransaction {
  id: string;
  rrn: string;
  amount: number;
  ocrExtractedAmount: number;
  remitterName: string;
  remitterVpa: string;
  beneficiaryName: string;
  beneficiaryVpa: string;
  bank: BankName;
  bankCode: string;
  status: VerificationStatus;
  disputeReason?: DisputeReason;
  timestamp: string;
  isoTimestamp: string;
  dayGroup: 'today' | 'week' | 'older';
  switchLatencyMs: number;
  ocrConfidence: number;
  timestampDeltaSec: number;
  npciResponseCode: string;
  npciMessage: string;
  proofHash: string;
  reconciled: boolean;
  settlementBatchId: string;
  receiptImageUrl?: string;
  elaImageUrl?: string;
  pdfDownloadUrl?: string;
  trustScore?: number;
  tamperScore?: number;
  visualAnomalies?: string[];
  ruleFlags?: string[];
  proofChain: ProofChainStep[];
  auditNotes: AuditNote[];
}

export interface VerificationRulesConfig {
  duplicateRrnBlock: boolean;
  maxTimestampDriftSec: number;
  autoFlagThresholdInr: number;
  minOcrConfidencePct: number;
  strictAmountMatch: boolean;
  webhookDispatchOnDispute: boolean;
}
