import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { VerificationStatus } from '../types/verification';

interface StatusBadgeProps {
  status: VerificationStatus;
  compact?: boolean;
}

const STATUS_MAP: Record<
  VerificationStatus,
  {
    label: string;
    shortLabel: string;
    classes: string;
    Icon: typeof CheckCircle2;
  }
> = {
  verified: {
    label: 'Verified',
    shortLabel: 'Verified',
    classes:
      'text-[#10B981] bg-[#10B981]/12 border-[#10B981]/30',
    Icon: CheckCircle2,
  },
  pending: {
    label: 'Pending',
    shortLabel: 'Pending',
    classes:
      'text-[#F59E0B] bg-[#F59E0B]/12 border-[#F59E0B]/30',
    Icon: Clock,
  },
  disputed: {
    label: 'Disputed',
    shortLabel: 'Disputed',
    classes:
      'text-[#EF4444] bg-[#EF4444]/12 border-[#EF4444]/30',
    Icon: AlertTriangle,
  },
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  const Icon = config.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap shrink-0 ${config.classes}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? config.shortLabel : config.label}</span>
    </span>
  );
}
