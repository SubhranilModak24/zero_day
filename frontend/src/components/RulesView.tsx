import { useState } from 'react';
import { Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { VerificationRulesConfig } from '../types/verification';
import { DEFAULT_RULES, formatInr } from '../data/mockLedger';

interface RulesViewProps {
  rules: VerificationRulesConfig;
  onUpdateRules: (next: VerificationRulesConfig) => void;
}

export function RulesView({ rules, onUpdateRules }: RulesViewProps) {
  const [savedToast, setSavedToast] = useState(false);

  const updateField = <K extends keyof VerificationRulesConfig>(
    key: K,
    value: VerificationRulesConfig[K]
  ) => {
    onUpdateRules({ ...rules, [key]: value });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const handleReset = () => {
    onUpdateRules(DEFAULT_RULES);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <section className="p-5 md:p-6 rounded-2xl bg-[#151F32] border border-[#233554] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg md:text-xl font-semibold text-white">
            Verification &amp; Fraud Guardrails
          </h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            Configure live rules applied to every payment processed in Instant Verify and batch sweeps.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {savedToast && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
              <Check className="w-4 h-4" />
              <span>Policy Active</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[42px] px-3.5 rounded-lg bg-[#233554]/40 hover:bg-[#1C2A44] border border-[#233554] hover:border-[#397BFF] text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle Cards */}
        <div className="p-5 rounded-2xl bg-[#151F32] border border-[#233554] flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Duplicate RRN / UTR Block</h3>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
              Automatically flag any payment proof whose 12-digit UTR already exists in the verified ledger.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={rules.duplicateRrnBlock}
            onClick={() => updateField('duplicateRrnBlock', !rules.duplicateRrnBlock)}
            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              rules.duplicateRrnBlock ? 'bg-[#397BFF]' : 'bg-[#0B1120] border border-[#233554]'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                rules.duplicateRrnBlock ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-[#151F32] border border-[#233554] flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Strict OCR-to-Switch Match</h3>
            <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
              Dispute any uploaded receipt whose OCR-extracted INR value differs from NPCI switch settlement.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={rules.strictAmountMatch}
            onClick={() => updateField('strictAmountMatch', !rules.strictAmountMatch)}
            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
              rules.strictAmountMatch ? 'bg-[#397BFF]' : 'bg-[#0B1120] border border-[#233554]'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                rules.strictAmountMatch ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Numeric Threshold Controls */}
        <div className="p-5 rounded-2xl bg-[#151F32] border border-[#233554] space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="threshold-inr" className="text-sm font-semibold text-white">
              High-Value Compliance Hold
            </label>
            <span className="font-mono text-sm font-semibold text-[#b1c5ff] tabular-nums">
              {formatInr(rules.autoFlagThresholdInr)}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Transactions above this INR amount enter Pending manual compliance review.
          </p>
          <input
            id="threshold-inr"
            type="range"
            min={10000}
            max={100000}
            step={5000}
            value={rules.autoFlagThresholdInr}
            onChange={(e) => updateField('autoFlagThresholdInr', Number(e.target.value))}
            className="w-full accent-[#397BFF] cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-[#64748B]">
            <span>₹10,000</span>
            <span>₹50,000</span>
            <span>₹1,00,000</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#151F32] border border-[#233554] space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="drift-sec" className="text-sm font-semibold text-white">
              Max Timestamp Drift Window
            </label>
            <span className="font-mono text-sm font-semibold text-[#b1c5ff] tabular-nums">
              {rules.maxTimestampDriftSec}s
            </span>
          </div>
          <p className="text-xs text-[#94A3B8]">
            Maximum allowed variance between receipt capture timestamp and bank switch confirmation.
          </p>
          <input
            id="drift-sec"
            type="range"
            min={30}
            max={300}
            step={15}
            value={rules.maxTimestampDriftSec}
            onChange={(e) => updateField('maxTimestampDriftSec', Number(e.target.value))}
            className="w-full accent-[#397BFF] cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-mono text-[#64748B]">
            <span>30s</span>
            <span>120s</span>
            <span>300s</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#0B1120] border border-[#233554] flex items-center gap-3 text-xs text-[#94A3B8]">
        <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
        <span>
          Changes take effect immediately across Instant Verify submissions and exception queue checks.
        </span>
      </div>
    </div>
  );
}
