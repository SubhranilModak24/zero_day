import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { UpiTransaction } from '../types/verification';
import { formatInr } from '../data/mockLedger';
import { StatusBadge } from './StatusBadge';

interface DisputeQueueViewProps {
  transactions: UpiTransaction[];
  onInspect: (tx: UpiTransaction) => void;
  onApprove: (id: string) => void;
  onAddNote: (id: string, message: string) => void;
}

export function DisputeQueueView({
  transactions,
  onInspect,
  onApprove,
  onAddNote,
}: DisputeQueueViewProps) {
  const [filterMode, setFilterMode] = useState<'disputed' | 'pending' | 'all-risk'>('all-risk');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const queueItems = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterMode === 'disputed') return tx.status === 'disputed';
      if (filterMode === 'pending') return tx.status === 'pending';
      return tx.status === 'disputed' || tx.status === 'pending';
    });
  }, [transactions, filterMode]);

  const disputedExposure = useMemo(
    () =>
      transactions
        .filter((t) => t.status === 'disputed')
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  const handleSaveNote = (id: string) => {
    const text = (noteDrafts[id] ?? '').trim();
    if (!text) return;
    onAddNote(id, text);
    setNoteDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Queue Summary Header */}
      <section className="p-5 md:p-6 rounded-2xl bg-[#151F32] border border-[#233554] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg md:text-xl font-semibold text-white">
            Fraud Deterrence &amp; Exception Triage
          </h2>
          <p className="text-sm text-[#94A3B8]">
            Review anomalous UPI proofs, duplicate UTR collisions, and delayed NPCI credit acknowledgements.
          </p>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div>
            <span className="text-xs text-[#94A3B8] block">Disputed Exposure</span>
            <span className="font-mono text-xl font-bold text-[#EF4444] tabular-nums">
              {formatInr(disputedExposure)}
            </span>
          </div>
          <div className="inline-flex p-1 rounded-xl bg-[#0B1120] border border-[#233554]">
            {(
              [
                { id: 'all-risk', label: 'All Exceptions' },
                { id: 'disputed', label: 'Disputed' },
                { id: 'pending', label: 'Pending' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-[#397BFF] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {queueItems.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#151F32] border border-[#233554] text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-[#10B981] mx-auto" />
          <p className="text-base font-semibold text-white font-display">
            Exception queue is clear
          </p>
          <p className="text-sm text-[#94A3B8]">
            All disputed and pending transactions in this view have been resolved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {queueItems.map((tx) => {
            const isDisputed = tx.status === 'disputed';
            const mismatch = Math.abs(tx.amount - tx.ocrExtractedAmount) > 0.01;
            return (
              <article
                key={tx.id}
                className="p-5 rounded-2xl bg-[#151F32] border border-[#233554] flex flex-col justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-base font-bold text-white tabular-nums">
                          {tx.rrn}
                        </span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <p className="text-xs text-[#94A3B8] font-mono mt-1 tabular-nums">
                        {tx.id} · {tx.bank} · {tx.timestamp}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-lg font-bold text-white tabular-nums">
                        {formatInr(tx.amount)}
                      </p>
                      {mismatch && (
                        <p className="text-xs font-mono text-[#EF4444] tabular-nums">
                          OCR: {formatInr(tx.ocrExtractedAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Diagnostic Alert Box */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                      isDisputed
                        ? 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#ffdad6]'
                        : 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#ffddb8]'
                    }`}
                  >
                    {isDisputed ? (
                      <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-white">
                        {tx.disputeReason ?? 'Awaiting Final Bank Credit Confirmation'}
                      </p>
                      <p className="mt-0.5 leading-relaxed opacity-90">{tx.npciMessage}</p>
                    </div>
                  </div>

                  {/* Quick Parties Summary */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#0B1120] border border-[#233554] text-xs">
                    <div className="min-w-0">
                      <span className="text-[#64748B] block">Remitter</span>
                      <span className="text-[#F8FAFC] font-medium truncate block mt-0.5">
                        {tx.remitterName}
                      </span>
                      <span className="font-mono text-[#94A3B8] truncate block">
                        {tx.remitterVpa}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[#64748B] block">Beneficiary</span>
                      <span className="text-[#F8FAFC] font-medium truncate block mt-0.5">
                        {tx.beneficiaryName}
                      </span>
                      <span className="font-mono text-[#94A3B8] truncate block">
                        {tx.beneficiaryVpa}
                      </span>
                    </div>
                  </div>

                  {/* Inline Compliance Note Logger */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={noteDrafts[tx.id] ?? ''}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [tx.id]: e.target.value }))
                      }
                      placeholder="Log quick investigation note..."
                      className="flex-1 min-h-[40px] px-3 rounded-lg bg-[#0B1120] border border-[#233554] text-xs text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#397BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveNote(tx.id)}
                      disabled={!(noteDrafts[tx.id] ?? '').trim()}
                      className="min-h-[40px] px-3 rounded-lg bg-[#233554]/50 hover:bg-[#1C2A44] disabled:opacity-40 border border-[#233554] text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                    >
                      Save Note
                    </button>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-[#1E293B]">
                  <button
                    type="button"
                    onClick={() => onInspect(tx)}
                    className="min-h-[42px] px-3.5 rounded-lg bg-[#233554]/40 hover:bg-[#1C2A44] border border-[#233554] hover:border-[#397BFF] text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Inspect Proof</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onApprove(tx.id)}
                    className="min-h-[42px] px-4 rounded-lg bg-[#397BFF] hover:bg-[#2B69EE] text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Clear &amp; Settle</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
