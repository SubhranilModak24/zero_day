import { useMemo, useState } from 'react';
import { CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { BankName, UpiTransaction } from '../types/verification';
import { downloadTextFile, formatInr } from '../data/mockLedger';

interface ReconciliationViewProps {
  transactions: UpiTransaction[];
  onAutoReconcile: () => number;
}

const ALL_BANKS: BankName[] = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra',
  'Union Bank of India',
];

export function ReconciliationView({
  transactions,
  onAutoReconcile,
}: ReconciliationViewProps) {
  const [batchRange, setBatchRange] = useState<'all' | 'today' | 'week'>('all');
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);

  const scopedTransactions = useMemo(() => {
    if (batchRange === 'today') return transactions.filter((t) => t.dayGroup === 'today');
    if (batchRange === 'week') return transactions.filter((t) => t.dayGroup !== 'older');
    return transactions;
  }, [transactions, batchRange]);

  const summary = useMemo(() => {
    const switchTotal = scopedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const settledTotal = scopedTransactions
      .filter((t) => t.status === 'verified')
      .reduce((sum, t) => sum + t.amount, 0);
    const variance = switchTotal - settledTotal;
    const matchPct = switchTotal > 0 ? (settledTotal / switchTotal) * 100 : 100;
    return { switchTotal, settledTotal, variance, matchPct };
  }, [scopedTransactions]);

  const bankBreakdown = useMemo(() => {
    return ALL_BANKS.map((bank) => {
      const rows = scopedTransactions.filter((t) => t.bank === bank);
      const total = rows.reduce((s, t) => s + t.amount, 0);
      const settled = rows
        .filter((t) => t.status === 'verified')
        .reduce((s, t) => s + t.amount, 0);
      const pendingCount = rows.filter((t) => t.status === 'pending').length;
      const disputedCount = rows.filter((t) => t.status === 'disputed').length;
      const avgLatency =
        rows.length > 0
          ? Math.round(rows.reduce((s, t) => s + t.switchLatencyMs, 0) / rows.length)
          : 0;
      return {
        bank,
        count: rows.length,
        total,
        settled,
        variance: total - settled,
        pendingCount,
        disputedCount,
        avgLatency,
      };
    });
  }, [scopedTransactions]);

  const handleRunAutoReconcile = () => {
    const count = onAutoReconcile();
    if (count > 0) {
      setReconcileNotice(`Auto-reconciled ${count} pending bank switch entries into T+0 settlement.`);
    } else {
      setReconcileNotice('All eligible switch-confirmed transactions are already reconciled.');
    }
    setTimeout(() => setReconcileNotice(null), 4000);
  };

  const handleExportReport = () => {
    const header = 'Bank,TxCount,SwitchTotalINR,SettledINR,UnreconciledVarianceINR,AvgLatencyMs\n';
    const body = bankBreakdown
      .map(
        (b) =>
          `"${b.bank}",${b.count},${b.total.toFixed(2)},${b.settled.toFixed(2)},${b.variance.toFixed(2)},${b.avgLatency}`
      )
      .join('\n');
    downloadTextFile('obsidian-reconciliation-report.csv', header + body, 'text/csv');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="p-5 md:p-6 rounded-2xl bg-[#151F32] border border-[#233554] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg md:text-xl font-semibold text-white">
            NPCI Switch &amp; Bank Reconciliation
          </h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            Compare switch-level UPI acknowledgements against settled beneficiary batches across clearing banks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 rounded-xl bg-[#0B1120] border border-[#233554]">
            {(
              [
                { id: 'all', label: 'All Batches' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Last 7 Days' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBatchRange(opt.id)}
                className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  batchRange === opt.id
                    ? 'bg-[#397BFF] text-white'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleRunAutoReconcile}
            className="min-h-[42px] px-4 rounded-lg bg-[#397BFF] hover:bg-[#2B69EE] text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Auto-Reconcile Pending</span>
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            className="min-h-[42px] px-4 rounded-lg bg-[#233554]/40 hover:bg-[#1C2A44] border border-[#233554] hover:border-[#397BFF] text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {reconcileNotice && (
        <div className="p-4 rounded-xl bg-[#10B981]/12 border border-[#10B981]/30 text-sm text-[#6ffbbe] flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>{reconcileNotice}</span>
        </div>
      )}

      {/* Summary Strip */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554]">
          <p className="text-xs font-medium text-[#94A3B8]">NPCI Switch Total</p>
          <p className="font-mono text-xl md:text-2xl font-bold text-white tabular-nums mt-1.5">
            {formatInr(summary.switchTotal)}
          </p>
        </div>
        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554]">
          <p className="text-xs font-medium text-[#94A3B8]">Settled &amp; Reconciled</p>
          <p className="font-mono text-xl md:text-2xl font-bold text-[#10B981] tabular-nums mt-1.5">
            {formatInr(summary.settledTotal)}
          </p>
        </div>
        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554]">
          <p className="text-xs font-medium text-[#94A3B8]">Unreconciled Variance</p>
          <p className="font-mono text-xl md:text-2xl font-bold text-[#F59E0B] tabular-nums mt-1.5">
            {formatInr(summary.variance)}
          </p>
        </div>
        <div className="p-4 md:p-5 rounded-2xl bg-[#151F32] border border-[#233554]">
          <p className="text-xs font-medium text-[#94A3B8]">Ledger Match Rate</p>
          <p className="font-mono text-xl md:text-2xl font-bold text-white tabular-nums mt-1.5">
            {summary.matchPct.toFixed(1)}%
          </p>
        </div>
      </section>

      {/* Bank-wise Breakdown Table (Desktop/Tablet) & Cards (Mobile) */}
      <div className="hidden md:block rounded-2xl bg-[#151F32] border border-[#233554] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#233554] bg-[#0d1322]/80 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#94A3B8]">
              <th className="py-3.5 px-5">Clearing Bank Rail</th>
              <th className="py-3.5 px-4 text-right">Events</th>
              <th className="py-3.5 px-4 text-right">Switch Volume</th>
              <th className="py-3.5 px-4 text-right">Settled Volume</th>
              <th className="py-3.5 px-4 text-right">Variance</th>
              <th className="py-3.5 px-5 text-right">Avg Switch Latency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]">
            {bankBreakdown.map((row) => (
              <tr key={row.bank} className="hover:bg-[#1C2A44]/50 transition-colors">
                <td className="py-4 px-5">
                  <p className="text-sm font-semibold text-white">{row.bank}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {row.pendingCount} pending · {row.disputedCount} disputed
                  </p>
                </td>
                <td className="py-4 px-4 text-right font-mono text-sm text-[#F8FAFC] tabular-nums">
                  {row.count}
                </td>
                <td className="py-4 px-4 text-right font-mono text-sm text-[#F8FAFC] tabular-nums">
                  {formatInr(row.total)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-sm text-[#10B981] tabular-nums">
                  {formatInr(row.settled)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-sm text-[#F59E0B] tabular-nums">
                  {formatInr(row.variance)}
                </td>
                <td className="py-4 px-5 text-right font-mono text-sm text-[#94A3B8] tabular-nums">
                  {row.avgLatency}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Bank Breakdown Cards */}
      <div className="md:hidden space-y-3">
        {bankBreakdown.map((row) => (
          <div
            key={row.bank}
            className="p-4 rounded-2xl bg-[#151F32] border border-[#233554] space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{row.bank}</p>
              <span className="text-xs font-mono text-[#94A3B8] tabular-nums">
                {row.count} tx · {row.avgLatency}ms
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1E293B] text-xs">
              <div>
                <span className="text-[#94A3B8] block">Settled</span>
                <span className="font-mono text-sm font-semibold text-[#10B981] tabular-nums">
                  {formatInr(row.settled)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#94A3B8] block">Variance</span>
                <span className="font-mono text-sm font-semibold text-[#F59E0B] tabular-nums">
                  {formatInr(row.variance)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
