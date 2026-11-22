import { UpiTransaction, VerificationRulesConfig } from '../types/verification';

export const DEFAULT_RULES: VerificationRulesConfig = {
  duplicateRrnBlock: true,
  maxTimestampDriftSec: 120,
  autoFlagThresholdInr: 50000,
  minOcrConfidencePct: 88,
  strictAmountMatch: true,
  webhookDispatchOnDispute: true,
};

// Clean initial transaction ledger (populated from verified uploads or Firestore on user login)
export const INITIAL_TRANSACTIONS: UpiTransaction[] = [];

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateProofHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hexBase = (h >>> 0).toString(16).padStart(8, '0');
  return `0x${hexBase}a94c7e2b18d05f3a6e91c4d7b2085f1a3c9e7d24`;
}

export function generateRandomRrn(): string {
  const prefix = '6324';
  const rest = Math.floor(10000000 + Math.random() * 89999999).toString();
  return `${prefix}${rest}`;
}

export function formatCurrentIst(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `Today, ${hh}:${mm}:${ss} IST`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
