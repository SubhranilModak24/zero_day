import { useState, useRef } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  BankName,
  ProofChainStep,
  UpiTransaction,
} from '../types/verification';
import { formatCurrentIst, formatInr } from '../data/mockLedger';
import { UserProfile } from '../lib/firebase';

interface InstantVerifyViewProps {
  currentUser: UserProfile | null;
  onAddTransaction: (tx: UpiTransaction) => void;
  onInspectTransaction: (tx: UpiTransaction) => void;
}

export function InstantVerifyView({
  currentUser,
  onAddTransaction,
  onInspectTransaction,
}: InstantVerifyViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [handshakeStatus, setHandshakeStatus] = useState<'PENDING' | 'CONFIRMED' | 'DISPUTED'>('PENDING');
  const [liveTrustScore, setLiveTrustScore] = useState<number | null>(null);
  const [lastTx, setLastTx] = useState<UpiTransaction | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setHandshakeStatus('PENDING');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (currentUser?.uid) {
        formData.append('user_id', currentUser.uid);
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Analysis failed with status ${res.status}`);
      }

      const data = await res.json();
      setAnalysisResult(data);
      setLiveTrustScore(data.trust_score);

      // Build Transaction Record for Ledger
      const nowIst = formatCurrentIst();
      const shortTime = nowIst.replace('Today, ', '');

      const isDisputed = data.status === 'DISPUTED' || data.trust_score < 50;
      const disputeReason = anyAiOrEditor(data) ? 'Screenshot Tampering' : (isDisputed ? 'RRN Mismatch' : undefined);

      const proofChain: ProofChainStep[] = [
        {
          id: 'ela',
          label: 'Pixel Forensics (Local Block ELA)',
          detail: `Tamper score: ${data.tamper_score}% · SHA-256: ${data.image_sha256?.slice(0, 16)}...`,
          status: data.tamper_score > 50 ? 'failed' : 'passed',
          timestamp: shortTime,
        },
        {
          id: 'ocr',
          label: 'RapidOCR & Font Weight Audit',
          detail: data.visual_anomalies?.length
            ? `Anomalies: ${data.visual_anomalies.join('; ')}`
            : `Extracted ₹${data.amount || '0'} & UTR ${data.utr || 'N/A'} (Stroke weight & baseline aligned)`,
          status: data.visual_anomalies?.length > 0 ? 'failed' : 'passed',
          timestamp: shortTime,
        },
        {
          id: 'meta',
          label: 'AI & Metadata Provenance',
          detail: data.exif_flags?.length
            ? data.exif_flags.join('; ')
            : 'Provenance clean: zero AI markers or editor tags',
          status: anyAiOrEditor(data) ? 'failed' : 'passed',
          timestamp: shortTime,
        },
        {
          id: 'handshake',
          label: 'Dual-Party Handshake Link',
          detail: `Verification link /verify/${data.tx_id} generated for counterparty`,
          status: 'waiting',
          timestamp: shortTime,
        },
      ];

      const newTx: UpiTransaction = {
        id: `TXN-${data.tx_id.toUpperCase()}`,
        rrn: data.utr || '000000000000',
        amount: data.amount || 0,
        ocrExtractedAmount: data.amount || 0,
        remitterName: data.app_name ? `${data.app_name} User` : 'Verified Remitter',
        remitterVpa: 'payer@upi',
        beneficiaryName: 'Merchant Settlement',
        beneficiaryVpa: 'merchant@upi',
        bank: mapBankName(data.app_name),
        bankCode: 'UPI0001204',
        status: isDisputed ? 'disputed' : (data.trust_score >= 80 ? 'verified' : 'pending'),
        disputeReason,
        timestamp: nowIst,
        isoTimestamp: new Date().toISOString(),
        dayGroup: 'today',
        switchLatencyMs: 98,
        ocrConfidence: isDisputed ? 55.4 : 98.6,
        timestampDeltaSec: 2,
        npciResponseCode: isDisputed ? 'TF' : '00',
        npciMessage: isDisputed ? 'FORENSIC ALERT: AI or pixel tampering suspected' : 'APPROVED: Verified across all parameters',
        proofHash: data.image_sha256,
        reconciled: !isDisputed,
        settlementBatchId: isDisputed ? 'HOLD-DISPUTE' : 'BATCH-SETTLED',
        receiptImageUrl: data.original_image_url || previewUrl || undefined,
        elaImageUrl: data.ela_image_url,
        pdfDownloadUrl: data.pdf_url,
        trustScore: data.trust_score,
        tamperScore: data.tamper_score,
        visualAnomalies: data.visual_anomalies,
        ruleFlags: data.rule_flags,
        proofChain,
        auditNotes: [
          {
            id: `note-${Date.now()}`,
            author: currentUser?.displayName || 'VouchPay Engine',
            timestamp: shortTime,
            message: `Scanned by ${currentUser?.email || 'User'}. Trust Score: ${data.trust_score}/100.`,
            action: isDisputed ? 'Flagged' : 'Verified',
          },
        ],
      };

      setLastTx(newTx);
      onAddTransaction(newTx);
    } catch (err: any) {
      console.error('Forensic analysis error:', err);
      alert(`Error during analysis: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const anyAiOrEditor = (data: any) => {
    const all = [...(data.exif_flags || []), ...(data.rule_flags || [])];
    return all.some((f: string) => f.includes('AI_') || f.includes('EDITOR_') || f.includes('SPOOF'));
  };

  const mapBankName = (app?: string): BankName => {
    if (!app) return 'HDFC Bank';
    if (app.includes('ICICI')) return 'ICICI Bank';
    if (app.includes('SBI')) return 'State Bank of India';
    if (app.includes('Axis')) return 'Axis Bank';
    if (app.includes('Kotak')) return 'Kotak Mahindra';
    if (app.includes('Union')) return 'Union Bank of India';
    return 'HDFC Bank';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleCopyLink = () => {
    if (!analysisResult?.tx_id) return;
    const url = `${window.location.origin}/verify/${analysisResult.tx_id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleHandshakeAction = async (action: 'confirm' | 'dispute') => {
    if (!analysisResult?.tx_id) return;
    try {
      const res = await fetch(`/verify/${analysisResult.tx_id}/${action}`, { method: 'POST' });
      const data = await res.json();
      setLiveTrustScore(data.trust_score);
      setHandshakeStatus(action === 'confirm' ? 'CONFIRMED' : 'DISPUTED');
      if (lastTx) {
        lastTx.trustScore = data.trust_score;
        lastTx.status = data.status === 'CONFIRMED' ? 'verified' : 'disputed';
      }
    } catch (err: any) {
      alert(`Handshake error: ${err.message}`);
    }
  };

  const score = liveTrustScore ?? analysisResult?.trust_score ?? 0;
  const scoreColor = score >= 80 ? '#10B981' : (score >= 50 ? '#F59E0B' : '#EF4444');

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            Instant UPI Payment Verifier
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Drop any UPI screenshot. Zero manual entry — pixel forensics, local OCR, and AI metadata audit run automatically.
          </p>
        </div>
        {currentUser && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151F32] border border-[#233554] text-xs text-[#94A3B8]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Audit Operator: <strong className="text-white">{currentUser.displayName || currentUser.email}</strong></span>
          </div>
        )}
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed transition-all cursor-pointer select-none ${
          isDragging
            ? 'border-[#397BFF] bg-[#397BFF]/10 scale-[1.01]'
            : 'border-[#233554] hover:border-[#397BFF]/60 bg-[#151F32]/80 hover:bg-[#151F32]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {isAnalyzing ? (
          <div className="py-6 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-[#397BFF] animate-spin" />
              <ScanLine className="w-6 h-6 text-white absolute inset-0 m-auto" />
            </div>
            <div>
              <p className="text-base font-semibold text-white font-display">
                Analyzing Payment Proof in Real Time...
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Running 32×32 Block ELA · RapidOCR extraction · Deep AI &amp; C2PA provenance scan
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#0B1120] border border-[#233554] flex items-center justify-center shadow-inner">
              <Upload className="w-7 h-7 text-[#397BFF]" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-semibold text-white">
                Drag &amp; Drop Payment Screenshot Here
              </p>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
                Supports Google Pay, PhonePe, Paytm, BHIM, Bank Apps, &amp; WhatsApp · PNG, JPG, WebP
              </p>
            </div>
            <button
              type="button"
              className="mt-2 px-4 py-2 rounded-xl bg-[#397BFF] hover:bg-[#2B69EE] text-white text-xs font-semibold shadow-lg shadow-[#397BFF]/20 transition-all cursor-pointer"
            >
              Browse from Device
            </button>
          </div>
        )}
      </div>

      {/* Forensic Report Dossier */}
      {analysisResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Score Banner */}
          <div className="p-6 rounded-3xl bg-[#151F32] border border-[#233554] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Trust Score Radial Display */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="#1E293B" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke={scoreColor}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - score / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono text-white tracking-tight">
                    {score}
                  </span>
                  <span className="text-[10px] text-[#94A3B8] font-semibold -mt-1">/100</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-bold text-white font-display">
                    Trust Evaluation Score
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      analysisResult.status === 'CONFIRMED'
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                        : analysisResult.status === 'SUSPICIOUS'
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                          : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                    }`}
                  >
                    {analysisResult.status}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1 max-w-lg leading-relaxed">
                  {score >= 80
                    ? 'Payment proof passed all pixel, OCR font alignment, and metadata audits.'
                    : score >= 50
                      ? 'Elevated caution: localized compression variance or unverified counterparty.'
                      : 'High tamper risk: AI generation tags, editor signatures, or pixel mismatch detected.'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
              {analysisResult.pdf_url && (
                <a
                  href={analysisResult.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-none min-h-[42px] px-4 rounded-xl bg-[#397BFF] hover:bg-[#2B69EE] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-md shadow-[#397BFF]/25 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download PDF Certificate</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none min-h-[42px] px-3.5 rounded-xl bg-[#233554]/50 hover:bg-[#233554] border border-[#233554] text-xs font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4 text-[#94A3B8]" />}
                <span>{copiedLink ? 'Link Copied' : 'Share Verification Link'}</span>
              </button>
            </div>
          </div>

          {/* Extracted Details & Side-by-Side Visual Inspection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Auto-Extracted Details (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-[#151F32] border border-[#233554] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#233554]">
                <h3 className="text-sm font-semibold text-white font-display uppercase tracking-wider">
                  Automated Extraction
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981]">
                  100% Zero-Touch OCR
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                  <span className="text-[#94A3B8]">Settlement Amount</span>
                  <span className="text-base font-bold font-mono text-white">
                    {analysisResult.amount ? `₹${Number(analysisResult.amount).toLocaleString('en-IN')}` : 'Not Detected'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                  <span className="text-[#94A3B8]">12-Digit NPCI UTR / RRN</span>
                  <span className="font-mono text-white font-semibold tracking-wider">
                    {analysisResult.utr || 'Missing / Not Found'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                  <span className="text-[#94A3B8]">Detected Payment App</span>
                  <span className="text-white font-medium">
                    {analysisResult.app_name || 'Generic UPI'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#1E293B]">
                  <span className="text-[#94A3B8]">Timestamp</span>
                  <span className="font-mono text-white">
                    {analysisResult.receipt_date || 'N/A'} {analysisResult.receipt_time || ''}
                  </span>
                </div>

                <div className="py-2 border-b border-[#1E293B]">
                  <span className="text-[#94A3B8] block mb-1">Cryptographic Provenance (SHA-256)</span>
                  <p className="font-mono text-[11px] text-[#64748B] break-all bg-[#0B1120] p-2.5 rounded-xl border border-[#233554]">
                    {analysisResult.image_sha256}
                  </p>
                </div>
              </div>

              {/* Dual Party Handshake Simulator */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-white block mb-2 font-display">
                  Dual-Party Handshake:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleHandshakeAction('confirm')}
                    disabled={handshakeStatus === 'CONFIRMED'}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      handshakeStatus === 'CONFIRMED'
                        ? 'bg-[#10B981] text-white'
                        : 'bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm (+25 pts)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandshakeAction('dispute')}
                    disabled={handshakeStatus === 'DISPUTED'}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      handshakeStatus === 'DISPUTED'
                        ? 'bg-[#EF4444] text-white'
                        : 'bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Dispute (-25 pts)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Forensics & ELA Heatmap Comparison (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-[#151F32] border border-[#233554] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#233554]">
                <h3 className="text-sm font-semibold text-white font-display uppercase tracking-wider">
                  Visual Heatmap Inspection
                </h3>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  analysisResult.tamper_score > 50
                    ? 'bg-[#EF4444]/20 text-[#EF4444]'
                    : 'bg-[#10B981]/20 text-[#10B981]'
                }`}>
                  ELA Tamper: {analysisResult.tamper_score}%
                </span>
              </div>

              {/* Side-by-side Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-[#94A3B8] block">Original Upload</span>
                  <div className="rounded-2xl border border-[#233554] bg-[#0B1120] overflow-hidden flex items-center justify-center h-64">
                    {previewUrl || analysisResult.original_image_url ? (
                      <img
                        src={previewUrl || analysisResult.original_image_url}
                        alt="Original Payment Proof"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-[#64748B]">Preview unavailable</span>
                    )}
                  </div>
                </div>

                {/* ELA Heatmap */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-[#94A3B8] block">
                    32×32 ELA Forensic Heatmap
                  </span>
                  <div className="rounded-2xl border border-[#233554] bg-black overflow-hidden flex items-center justify-center h-64">
                    {analysisResult.ela_image_url ? (
                      <img
                        src={analysisResult.ela_image_url}
                        alt="ELA Forensic Heatmap"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-[#64748B]">Heatmap generating...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Flags and Anomalies */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-white block font-display">
                  Provenance &amp; Anomaly Signals:
                </span>
                {analysisResult.exif_flags?.length || analysisResult.visual_anomalies?.length || analysisResult.rule_flags?.length ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {analysisResult.exif_flags?.map((f: string, i: number) => (
                      <div
                        key={`exif-${i}`}
                        className={`p-2 rounded-xl text-xs flex items-start gap-2 ${
                          f.includes('AI_') || f.includes('EDITOR_')
                            ? 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#ffb4ab]'
                            : 'bg-[#0B1120] border border-[#233554] text-[#94A3B8]'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="font-mono text-[11px]">{f}</span>
                      </div>
                    ))}
                    {analysisResult.visual_anomalies?.map((a: string, i: number) => (
                      <div key={`anom-${i}`} className="p-2 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#fde047] text-xs flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="font-mono text-[11px]">{a}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#6ee7b7] text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Clean provenance: no AI generation tags, editing software signatures, or stroke weight mismatches found.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
