import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  ChevronRight,
  Download,
  Filter,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  BankName,
  UpiTransaction,
  VerificationStatus,
} from '../types/verification';
import { downloadTextFile, formatInr } from '../data/mockLedger';
import { StatusBadge } from './StatusBadge';

interface LedgerViewProps {
  transactions: UpiTransaction[];
  sessionVerifiedIds: Set<string>;
  onInspect: (tx: UpiTransaction) => void;
  onBatchApprove: (ids: string[]) => void;
  onNavigateVerify: () => void;
}

const BANKS: Array<'All' | BankName> = [
  'All',
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra',
  'Union Bank of India',
];

export function LedgerView({
  transactions,
  sessionVerifiedIds,
  onInspect,
  onBatchApprove,
  onNavigateVerify,
}: LedgerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [bankFilter, setBankFilter] = useState<'All' | BankName>('All');
  const [timeWindow, setTimeWindow] = useState<'all' | 'today' | 'week'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'amount-desc' | 'amount-asc'>('recent');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const counts = useMemo(() => {
    const verified = transactions.filter((t) => t.status === 'verified');
    const sessionVerified = verified.filter((t) => sessionVerifiedIds.has(t.id));
    const pending = transactions.filter((t) => t.status === 'pending');
    const disputed = transactions.filter((t) => t.status === 'disputed');
    const verifiedVolume = sessionVerified.reduce((acc, t) => acc + t.amount, 0);
    const settlementRate =
      transactions.length > 0
        ? (verified.length / transactions.length) * 100
        : 0;
    return {
      total: transactions.length,
      verifiedCount: verified.length,
      sessionVerifiedCount: sessionVerified.length,
      pendingCount: pending.length,
      disputedCount: disputed.length,
      verifiedVolume,
      settlementRate,
    };
  }, [transactions, sessionVerifiedIds]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = transactions.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (bankFilter !== 'All' && t.bank !== bankFilter) return false;
      if (timeWindow === 'today' && t.dayGroup !== 'today') return false;
      if (timeWindow === 'week' && t.dayGroup === 'older') return false;
      if (!q) return true;
      return (
        t.rrn.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.remitterName.toLowerCase().includes(q) ||
        t.remitterVpa.toLowerCase().includes(q) ||
        t.beneficiaryName.toLowerCase().includes(q) ||
        t.beneficiaryVpa.toLowerCase().includes(q)
      );
    });

    if (sortBy === 'amount-desc') {
      return [...list].sort((a, b) => b.amount - a.amount);
    }
    if (sortBy === 'amount-asc') {
      return [...list].sort((a, b) => a.amount - b.amount);
    }
    return list;
  }, [transactions, searchQuery, statusFilter, bankFilter, timeWindow, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((t) => t.id));
    }
  };

  const handleExportSelected = () => {
    const target =
      selectedIds.length > 0
        ? transactions.filter((t) => selectedIds.includes(t.id))
        : filtered;
    const header = 'ID,RRN,Status,AmountINR,OCR_AmountINR,RemitterVPA,BeneficiaryVPA,Bank,Timestamp\n';
    const rows = target
      .map(
        (t) =>
          `${t.id},${t.rrn},${t.status},${t.amount.toFixed(2)},${t.ocrExtractedAmount.toFixed(2)},"${t.remitterVpa}","${t.beneficiaryVpa}","${t.bank}","${t.timestamp}"`
      )
      .join('\n');
    downloadTextFile('obsidian-trust-ledger.csv', header + rows, 'text/csv');
  };

  const handleCycleSort = () => {
    setSortBy((prev) =>
      prev === 'recent'
        ? 'amount-desc'
        : prev === 'amount-desc'
          ? 'amount-asc'
          : 'recent'
    );
  };

  const sortLabel =
    sortBy === 'recent'
      ? 'Newest'
      : sortBy === 'amount-desc'
        ? 'Amount: High'
        : 'Amount: Low';

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip (4-column desktop, 2-column mobile/tablet) */}
      <section aria-label="Verification Overview Metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-medium text-[#94A3B8]">Verified Volume</p>
          <p className="text-xl md:text-2xl font-bold text-white font-mono tabular-nums mt-1.5 tracking-tight">
            {formatInr(counts.verifiedVolume)}
          </p>
          <p className="text-xs text-[#10B981] mt-1 font-medium">
            {counts.sessionVerifiedCount} verified this session
          </p>
        </div>

        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-medium text-[#94A3B8]">Settlement Rate</p>
          <p className="text-xl md:text-2xl font-bold text-white font-mono tabular-nums mt-1.5 tracking-tight">
            {counts.settlementRate.toFixed(1)}%
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Across {counts.total} audited events
          </p>
        </div>

        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-medium text-[#94A3B8]">Awaiting Signal</p>
          <p className="text-xl md:text-2xl font-bold text-[#F59E0B] font-mono tabular-nums mt-1.5 tracking-tight">
            {counts.pendingCount}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Pending NPCI credit ack
          </p>
        </div>

        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554] shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-medium text-[#94A3B8]">Flagged Anomalies</p>
          <p className="text-xl md:text-2xl font-bold text-[#EF4444] font-mono tabular-nums mt-1.5 tracking-tight">
            {counts.disputedCount}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Held for compliance audit
          </p>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section
        aria-label="Ledger Filters"
        className="p-4 rounded-2xl bg-[#151F32] border border-[#233554] space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search
              className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by 12-digit RRN, VPA (@okicici), merchant, or TXN ID..."
              className="w-full min-h-[44px] pl-10 pr-10 rounded-lg bg-[#0B1120] border border-[#233554] text-sm text-white placeholder:text-[#64748B] focus:outline-none focus:border-[#397BFF] focus:shadow-[0_0_0_3px_rgba(57,123,255,0.15)] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Bank, Date Window & Sort Controls */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 md:pb-0">
            <div className="relative flex items-center shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 pointer-events-none" />
              <select
                aria-label="Filter by Bank Rail"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value as 'All' | BankName)}
                className="min-h-[42px] pl-8 pr-7 rounded-lg bg-[#0B1120] border border-[#233554] text-xs font-medium text-[#F8FAFC] focus:outline-none focus:border-[#397BFF] cursor-pointer"
              >
                {BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank === 'All' ? 'All Bank Rails' : bank}
                  </option>
                ))}
              </select>
            </div>

            <select
              aria-label="Filter by Time Window"
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value as 'all' | 'today' | 'week')}
              className="min-h-[42px] px-3 rounded-lg bg-[#0B1120] border border-[#233554] text-xs font-medium text-[#F8FAFC] focus:outline-none focus:border-[#397BFF] shrink-0 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
            </select>

            <button
              type="button"
              onClick={handleCycleSort}
              className="min-h-[42px] px-3.5 rounded-lg bg-[#0B1120] border border-[#233554] hover:border-[#397BFF] text-xs font-medium text-[#F8FAFC] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>{sortLabel}</span>
            </button>

            <button
              type="button"
              onClick={handleExportSelected}
              className="min-h-[42px] px-3.5 rounded-lg bg-[#233554]/40 hover:bg-[#1C2A44] border border-[#233554] hover:border-[#397BFF] text-xs font-semibold text-[#F8FAFC] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Status Segmented Tabs + Batch Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div
            role="tablist"
            aria-label="Filter by verification status"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0B1120] border border-[#233554] overflow-x-auto max-w-full"
          >
            {(
              [
                { id: 'all', label: 'All', count: counts.total },
                { id: 'verified', label: 'Verified', count: counts.verifiedCount },
                { id: 'pending', label: 'Pending', count: counts.pendingCount },
                { id: 'disputed', label: 'Disputed', count: counts.disputedCount },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#397BFF] text-white shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      active ? 'text-white/90' : 'text-[#64748B]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2.5 bg-[#1C2A44] border border-[#397BFF]/40 px-3.5 py-1.5 rounded-xl">
              <span className="text-xs font-medium text-white font-mono tabular-nums">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => {
                  onBatchApprove(selectedIds);
                  setSelectedIds([]);
                }}
                className="min-h-[32px] px-3 rounded-lg bg-[#10B981] hover:bg-[#059669] text-[#002113] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Approve Selected</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-[#94A3B8] hover:text-white px-1.5 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#151F32] border border-[#233554] text-center space-y-3">
          <p className="text-base font-semibold text-white font-display">
            {transactions.length === 0
              ? 'No UPI transactions recorded yet'
              : 'No matching UPI verification records'}
          </p>
          <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
            {transactions.length === 0
              ? 'Submit a fresh UPI payment in Instant Verify. Approved transactions add to Verified Volume, while disputed ones remain visible without adding to the verified total.'
              : 'Try clearing your search filter or submit a new 12-digit RRN to verify a payment directly against the switch.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setBankFilter('All');
                  setTimeWindow('all');
                }}
                className="min-h-[42px] px-4 rounded-lg border border-[#233554] bg-[#0B1120] text-xs font-semibold text-white hover:border-[#397BFF] cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateVerify}
              className="min-h-[42px] px-4 rounded-lg bg-[#397BFF] text-xs font-semibold text-white hover:bg-[#2B69EE] cursor-pointer"
            >
              Verify New Payment
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet High-Density Audit Table (>= 768px) */}
          <div className="hidden md:block rounded-2xl bg-[#151F32] border border-[#233554] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#233554] bg-[#0d1322]/80 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#94A3B8]">
                    <th className="py-3.5 pl-5 pr-2 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all visible rows"
                        checked={
                          selectedIds.length === filtered.length && filtered.length > 0
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-[#233554] bg-[#0B1120] accent-[#397BFF] cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3">Transaction / RRN</th>
                    <th className="py-3.5 px-3">Parties &amp; VPA</th>
                    <th className="py-3.5 px-3">Bank Rail</th>
                    <th className="py-3.5 px-3 text-right">Amount</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]">
                  {filtered.map((tx) => {
                    const isSelected = selectedIds.includes(tx.id);
                    const mismatch = Math.abs(tx.amount - tx.ocrExtractedAmount) > 0.01;
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => onInspect(tx)}
                        className="group hover:bg-[#1C2A44]/75 transition-colors cursor-pointer"
                      >
                        <td
                          className="py-3.5 pl-5 pr-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select ${tx.id}`}
                            checked={isSelected}
                            onChange={() => toggleSelect(tx.id)}
                            className="w-4 h-4 rounded border-[#233554] bg-[#0B1120] accent-[#397BFF] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-mono text-sm font-semibold text-white tabular-nums">
                            {tx.rrn}
                          </div>
                          <div className="text-xs text-[#64748B] font-mono mt-0.5 tabular-nums">
                            {tx.id} · {tx.timestamp}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 max-w-[260px]">
                          <div className="text-sm font-medium text-[#F8FAFC] truncate">
                            {tx.remitterName} → {tx.beneficiaryName}
                          </div>
                          <div className="text-xs text-[#94A3B8] font-mono truncate mt-0.5">
                            {tx.remitterVpa}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-sm text-[#F8FAFC] whitespace-nowrap">
                            {tx.bank}
                          </div>
                          <div className="text-xs text-[#64748B] font-mono mt-0.5">
                            Code {tx.npciResponseCode} · {tx.switchLatencyMs}ms
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="font-mono text-sm font-semibold text-white tabular-nums">
                            {formatInr(tx.amount)}
                          </div>
                          {mismatch && (
                            <div className="text-[11px] font-mono text-[#EF4444] tabular-nums mt-0.5">
                              OCR: {formatInr(tx.ocrExtractedAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspect(tx);
                            }}
                            className="min-h-[36px] px-3 rounded-lg bg-[#233554]/40 group-hover:bg-[#397BFF] border border-[#233554] group-hover:border-[#397BFF] text-xs font-semibold text-[#F8FAFC] inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Autonomous Verification Proof Cards (< 768px) */}
          <div className="md:hidden space-y-3">
            {filtered.map((tx) => {
              const mismatch = Math.abs(tx.amount - tx.ocrExtractedAmount) > 0.01;
              return (
                <article
                  key={tx.id}
                  onClick={() => onInspect(tx)}
                  className="p-4 rounded-2xl bg-[#151F32] border border-[#233554] active:bg-[#1C2A44] transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-white tabular-nums">
                        {tx.rrn}
                      </p>
                      <p className="text-xs text-[#94A3B8] font-mono mt-0.5 tabular-nums">
                        {tx.id} · {tx.timestamp}
                      </p>
                    </div>
                    <StatusBadge status={tx.status} compact />
                  </div>

                  <div className="flex items-baseline justify-between gap-3 pt-1 border-t border-[#1E293B]">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F8FAFC] truncate">
                        {tx.remitterName}
                      </p>
                      <p className="text-xs text-[#94A3B8] font-mono truncate">
                        {tx.remitterVpa} · {tx.bank}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-base font-bold text-white tabular-nums">
                        {formatInr(tx.amount)}
                      </p>
                      {mismatch && (
                        <p className="text-[11px] font-mono text-[#EF4444] tabular-nums">
                          OCR {formatInr(tx.ocrExtractedAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-mono text-[#64748B] truncate">
                      {tx.proofHash.slice(0, 18)}…
                    </span>
                    <span className="font-semibold text-[#b1c5ff] inline-flex items-center gap-1 shrink-0">
                      <span>Inspect Proof</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
