import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { DisputeReason, UpiTransaction } from '../types/verification';
import { downloadTextFile, formatInr } from '../data/mockLedger';
import { StatusBadge } from './StatusBadge';

interface EvidenceDrawerProps {
  transaction: UpiTransaction | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onFlagDispute: (id: string, reason: DisputeReason) => void;
  onRequeryNpci: (id: string) => Promise<void>;
  onAddNote: (id: string, message: string) => void;
}

const DISPUTE_REASONS: DisputeReason[] = [
  'Screenshot Tampering',
  'RRN Mismatch',
  'Duplicate UTR',
  'Velocity Breach',
  'Timestamp Drift',
  'Manual Compliance Hold',
];

export function EvidenceDrawer({
  transaction,
  onClose,
  onApprove,
  onFlagDispute,
  onRequeryNpci,
  onAddNote,
}: EvidenceDrawerProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRrn, setCopiedRrn] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isRequerying, setIsRequerying] = useState(false);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [selectedReason, setSelectedReason] = useState<DisputeReason>('Screenshot Tampering');
  const [noteInput, setNoteInput] = useState('');
  const [activeImageTab, setActiveImageTab] = useState<'receipt' | 'ela'>('receipt');

  useEffect(() => {
    setShowFlagPicker(false);
    setNoteInput('');
    setCopiedHash(false);
    setCopiedRrn(false);
    setCopiedId(false);
    setActiveImageTab(transaction?.receiptImageUrl ? 'receipt' : 'ela');
  }, [transaction?.id]);

  useEffect(() => {
    if (!transaction) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [transaction, onClose]);

  if (!transaction) return null;

  const amountMismatch = Math.abs(transaction.amount - transaction.ocrExtractedAmount) > 0.01;
  const isDisputed = transaction.status === 'disputed';
  const isVerified = transaction.status === 'verified';

  const handleCopy = async (text: string, kind: 'hash' | 'rrn' | 'id') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback
    }
    if (kind === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1800);
    } else if (kind === 'rrn') {
      setCopiedRrn(true);
      setTimeout(() => setCopiedRrn(false), 1800);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    }
  };

  const handleRequery = async () => {
    setIsRequerying(true);
    try {
      await onRequeryNpci(transaction.id);
    } finally {
      setIsRequerying(false);
    }
  };

  const handleDownloadProof = () => {
    const certificate = {
      platform: 'VouchPay Verification Engine',
      generatedAt: new Date().toISOString(),
      transactionId: transaction.id,
      rrn: transaction.rrn,
      status: transaction.status,
      trustScore: transaction.trustScore,
      amountInr: transaction.amount,
      ocrExtractedAmountInr: transaction.ocrExtractedAmount,
      remitter: { name: transaction.remitterName, vpa: transaction.remitterVpa },
      beneficiary: { name: transaction.beneficiaryName, vpa: transaction.beneficiaryVpa },
      bank: { name: transaction.bank, ifsc: transaction.bankCode },
      npciResponse: {
        code: transaction.npciResponseCode,
        message: transaction.npciMessage,
        switchLatencyMs: transaction.switchLatencyMs,
      },
      cryptographicProofHash: transaction.proofHash,
      proofChain: transaction.proofChain,
      auditNotes: transaction.auditNotes,
    };
    downloadTextFile(
      `vouchpay-proof-${transaction.rrn}.json`,
      JSON.stringify(certificate, null, 2),
      'application/json'
    );
  };

  const handleSubmitNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    onAddNote(transaction.id, trimmed);
    setNoteInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
    >
      {/* Blurred backdrop overlay */}
      <div
        className="fixed inset-0 bg-[#0B1120]/80 backdrop-blur-[8px] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside className="relative z-10 w-full md:w-[620px] lg:w-[680px] max-w-full max-h-[94vh] md:max-h-full md:h-full bg-[#151F32] border-t md:border-t-0 md:border-l border-[#233554] rounded-t-3xl md:rounded-none shadow-[-16px_0_48px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        {/* Mobile drag handle */}
        <div className="md:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="w-12 h-1.5 rounded-full bg-[#233554]" aria-hidden="true" />
        </div>

        {/* Sticky Drawer Header */}
        <header className="px-5 md:px-7 py-4 border-b border-[#233554] bg-[#0d1322]/95 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-base md:text-lg font-bold text-white font-mono tracking-tight">
                {transaction.id}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(transaction.id, 'id')}
                title="Copy Transaction ID"
                className="p-1 rounded text-[#94A3B8] hover:text-white transition-colors"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <StatusBadge status={transaction.status} />
              {transaction.trustScore !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                    transaction.trustScore >= 80
                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                      : transaction.trustScore >= 50
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                      : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30'
                  }`}
                >
                  Score {transaction.trustScore}/100
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 font-mono tabular-nums truncate">
              RRN: {transaction.rrn} · {transaction.timestamp}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence drawer"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-[#233554] bg-[#151F32] text-[#94A3B8] hover:text-white hover:border-[#397BFF] transition-all shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Evidence Body with generous bottom padding for sticky footer */}
        <div className="flex-1 overflow-y-auto px-5 md:px-7 py-6 space-y-6 pb-40">
          {/* Primary Amount & Switch Card */}
          <div className="p-4 md:p-5 rounded-2xl bg-[#0B1120] border border-[#233554] grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#94A3B8] block mb-1">
                Settled Amount
              </span>
              <span className="text-2xl md:text-3xl font-bold text-white font-mono tabular-nums tracking-tight">
                {formatInr(transaction.amount)}
              </span>
              <span className="text-xs text-[#64748B] block mt-1">
                Via {transaction.bank}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-[#94A3B8] block mb-1">
                OCR Extracted Value
              </span>
              <span
                className={`text-2xl md:text-3xl font-bold font-mono tabular-nums tracking-tight ${
                  amountMismatch ? 'text-[#EF4444]' : 'text-[#10B981]'
                }`}
              >
                {formatInr(transaction.ocrExtractedAmount)}
              </span>
              <span className="text-xs text-[#64748B] block mt-1">
                {amountMismatch ? '⚠️ Discrepancy' : '✓ 100% Match'}
              </span>
            </div>
          </div>

          {/* Anomaly / Dispute Banner if flagged */}
          {(amountMismatch || transaction.disputeReason || isDisputed) && (
            <div className="p-4 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-white">
                  {transaction.disputeReason ?? 'Anomaly or Discrepancy Flagged'}
                </p>
                <p className="text-[#CBD5E1] text-xs mt-1 leading-relaxed">
                  {transaction.npciMessage || 'This transaction has triggered fraud or compliance risk rules.'}
                </p>
              </div>
            </div>
          )}

          {/* Submitted Payment Proof & ELA Heatmap Inspector */}
          {(transaction.receiptImageUrl || transaction.elaImageUrl) && (
            <section className="rounded-2xl bg-[#0B1120] border border-[#233554] overflow-hidden">
              <div className="p-3.5 border-b border-[#1E293B] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#397BFF]" />
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Forensic Image Inspection
                  </h3>
                </div>
                {/* View Switcher Tabs */}
                {transaction.receiptImageUrl && transaction.elaImageUrl && (
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#151F32] border border-[#233554]">
                    <button
                      type="button"
                      onClick={() => setActiveImageTab('receipt')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        activeImageTab === 'receipt'
                          ? 'bg-[#397BFF] text-white shadow-sm'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageTab('ela')}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        activeImageTab === 'ela'
                          ? 'bg-[#EF4444] text-white shadow-sm'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      ELA Heatmap
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col items-center justify-center bg-[#070b14]">
                {activeImageTab === 'receipt' && transaction.receiptImageUrl ? (
                  <div className="w-full flex flex-col items-center">
                    <img
                      src={transaction.receiptImageUrl}
                      alt={`Receipt ${transaction.rrn}`}
                      className="max-h-80 w-auto object-contain rounded-xl border border-[#233554] shadow-md"
                    />
                    <p className="text-[11px] text-[#94A3B8] mt-2 font-mono">
                      Captured UPI Payment Screenshot
                    </p>
                  </div>
                ) : transaction.elaImageUrl ? (
                  <div className="w-full flex flex-col items-center">
                    <img
                      src={transaction.elaImageUrl}
                      alt={`ELA Heatmap ${transaction.rrn}`}
                      className="max-h-80 w-auto object-contain rounded-xl border border-[#EF4444]/40 bg-black shadow-md"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-[#EF4444] font-mono">
                        32×32 Local Block Error Level Analysis
                      </span>
                      {transaction.tamperScore !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                          Tamper: {transaction.tamperScore}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Visual Anomalies Checklist */}
              {transaction.visualAnomalies && transaction.visualAnomalies.length > 0 && (
                <div className="p-3.5 border-t border-[#1E293B] bg-[#EF4444]/5 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#EF4444] block">
                    Detected Visual &amp; Font Anomalies:
                  </span>
                  {transaction.visualAnomalies.map((anom, i) => (
                    <p key={i} className="text-xs text-[#FCA5A5] font-mono flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>{anom}</span>
                    </p>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Cryptographic Proof Chain */}
          <section aria-labelledby="proof-chain-heading">
            <div className="flex items-center justify-between mb-3">
              <h3
                id="proof-chain-heading"
                className="text-xs font-semibold text-white uppercase tracking-wider font-display flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#397BFF]" />
                <span>Verification Proof Chain</span>
              </h3>
              <span className="text-xs font-mono text-[#94A3B8] tabular-nums">
                Switch Latency: {transaction.switchLatencyMs}ms
              </span>
            </div>
            <div className="rounded-2xl bg-[#0B1120] border border-[#233554] divide-y divide-[#1E293B] overflow-hidden">
              {transaction.proofChain.map((step) => {
                const iconEl =
                  step.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  ) : step.status === 'failed' ? (
                    <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  );

                return (
                  <div key={step.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-[#151F32]/50 transition-colors">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {iconEl}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#F8FAFC]">
                          {step.label}
                        </p>
                        <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed break-words">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#64748B] whitespace-nowrap shrink-0 tabular-nums">
                      {step.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Structured Key-Value Verification Telemetry */}
          <section aria-labelledby="telemetry-kv-heading">
            <h3
              id="telemetry-kv-heading"
              className="text-xs font-semibold text-white uppercase tracking-wider font-display mb-3"
            >
              Bank Routing &amp; Proof Telemetry
            </h3>
            <div className="rounded-2xl bg-[#0B1120] border border-[#233554] p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#94A3B8]">12-Digit RRN / UTR</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#F8FAFC] font-bold tabular-nums">
                    {transaction.rrn}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transaction.rrn, 'rrn')}
                    aria-label="Copy RRN"
                    className="p-1 rounded-md border border-[#233554] text-[#94A3B8] hover:text-white hover:border-[#397BFF] transition-colors cursor-pointer"
                  >
                    {copiedRrn ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#1E293B]">
                <span className="text-[#94A3B8]">Remitter VPA</span>
                <span className="font-mono text-[#F8FAFC] text-right truncate">
                  {transaction.remitterVpa}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#1E293B]">
                <span className="text-[#94A3B8]">Beneficiary VPA</span>
                <span className="font-mono text-[#F8FAFC] text-right truncate">
                  {transaction.beneficiaryVpa}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#1E293B]">
                <span className="text-[#94A3B8]">Issuing Rail / IFSC</span>
                <span className="font-mono text-[#F8FAFC] text-right">
                  {transaction.bank} · {transaction.bankCode}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#1E293B]">
                <span className="text-[#94A3B8]">NPCI Response Code</span>
                <span className="font-mono text-[#F8FAFC] text-right font-medium">
                  Code {transaction.npciResponseCode}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-[#1E293B]">
                <span className="text-[#94A3B8]">OCR Confidence / Delta</span>
                <span className="font-mono text-[#F8FAFC] tabular-nums">
                  {transaction.ocrConfidence.toFixed(1)}% · +{transaction.timestampDeltaSec}s
                </span>
              </div>

              <div className="pt-2.5 border-t border-[#1E293B]">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[#94A3B8]">Cryptographic Proof Hash</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transaction.proofHash, 'hash')}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#397BFF] hover:text-[#2B69EE] cursor-pointer"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3 h-3 text-[#10B981]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-[#94A3B8] break-all bg-[#151F32] px-3 py-2 rounded-lg border border-[#233554]">
                  {transaction.proofHash}
                </p>
              </div>
            </div>
          </section>

          {/* Flag Reason Selector (when user clicks Flag Anomaly) */}
          {showFlagPicker && (
            <section className="p-4 rounded-2xl bg-[#1C2A44] border border-[#EF4444]/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Select Anomaly Classification</h4>
                <button
                  type="button"
                  onClick={() => setShowFlagPicker(false)}
                  className="text-xs text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DISPUTE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition-colors cursor-pointer ${
                      selectedReason === reason
                        ? 'bg-[#EF4444]/20 border-[#EF4444] text-white'
                        : 'bg-[#0B1120] border-[#233554] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onFlagDispute(transaction.id, selectedReason);
                  setShowFlagPicker(false);
                }}
                className="w-full min-h-[44px] rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Confirm Dispute Flag
              </button>
            </section>
          )}

          {/* Compliance Audit Notes */}
          <section aria-labelledby="audit-notes-heading">
            <h3
              id="audit-notes-heading"
              className="text-xs font-semibold text-white uppercase tracking-wider font-display mb-3"
            >
              Compliance Audit Trail
            </h3>
            <div className="space-y-2.5 mb-3">
              {transaction.auditNotes.length === 0 ? (
                <p className="text-xs text-[#64748B] bg-[#0B1120] border border-[#233554] rounded-xl px-4 py-3">
                  No manual compliance notes recorded yet.
                </p>
              ) : (
                transaction.auditNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-[#0B1120] border border-[#233554] rounded-xl px-4 py-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#F8FAFC]">{note.author}</span>
                      <span className="font-mono text-[#64748B] tabular-nums">{note.timestamp}</span>
                    </div>
                    <p className="text-[#94A3B8] mt-1 leading-relaxed">{note.message}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSubmitNote} className="flex items-center gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add compliance note..."
                className="flex-1 min-h-[40px] px-3.5 rounded-lg bg-[#0B1120] border border-[#233554] text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#397BFF]"
              />
              <button
                type="submit"
                disabled={!noteInput.trim()}
                className="min-h-[40px] px-4 rounded-lg bg-[#233554]/60 hover:bg-[#1C2A44] disabled:opacity-40 border border-[#233554] text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Add Note
              </button>
            </form>
          </section>
        </div>

        {/* Sticky Action Footer — Redesigned for zero truncation & clean tiering */}
        <footer className="px-5 md:px-7 py-3.5 border-t border-[#233554] bg-[#0d1322]/98 backdrop-blur-md shrink-0 space-y-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
          {/* Tier 1: Primary Decision Actions */}
          <div className="flex items-center gap-2.5">
            {!isVerified && (
              <button
                type="button"
                onClick={() => onApprove(transaction.id)}
                className="flex-1 min-h-[42px] px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Approve &amp; Settle</span>
              </button>
            )}

            {!isDisputed && (
              <button
                type="button"
                onClick={() => setShowFlagPicker((v) => !v)}
                className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444] border border-[#EF4444]/40 text-[#EF4444] hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Flag Anomaly</span>
              </button>
            )}
          </div>

          {/* Tier 2: Utility & Export Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRequery}
              disabled={isRequerying}
              title="Poll NPCI switch for status update"
              className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#151F32] hover:bg-[#1C2A44] border border-[#233554] text-xs font-medium text-[#94A3B8] hover:text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRequerying ? 'animate-spin text-[#397BFF]' : ''}`} />
              <span>{isRequerying ? 'Querying...' : 'Re-query'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadProof}
              title="Download cryptographic audit proof as JSON"
              className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#151F32] hover:bg-[#1C2A44] border border-[#233554] text-xs font-medium text-[#94A3B8] hover:text-white inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON Proof</span>
            </button>

            {transaction.pdfDownloadUrl && (
              <a
                href={transaction.pdfDownloadUrl}
                target="_blank"
                rel="noreferrer"
                title="Download tamper-evident forensic PDF certificate"
                className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#397BFF]/15 hover:bg-[#397BFF] border border-[#397BFF]/40 text-xs font-medium text-[#93c5fd] hover:text-white inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Cert</span>
              </a>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
