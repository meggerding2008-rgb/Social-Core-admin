import type { SupportMessageStatus } from '@/lib/support/types';
import { getSupportStatusLabel } from '@/lib/support/labels';

const STATUS_STYLES: Record<SupportMessageStatus, string> = {
  open: 'border-brand-accent/40 bg-brand-mist text-brand-navy',
  in_behandeling: 'border-brand-navy/30 bg-white text-brand-navy',
  beantwoord: 'border-brand-border bg-white text-brand-accent',
  opgelost: 'border-brand-border bg-brand-mist text-brand-accent',
  gesloten: 'border-brand-border bg-brand-mist text-brand-accent',
};

export function StatusBadge({ status }: { status: SupportMessageStatus }) {
  return (
    <span
      className={`inline-flex rounded-[8px] border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {getSupportStatusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: boolean }) {
  if (!priority) {
    return (
      <span className="inline-flex rounded-[8px] border border-brand-border px-2 py-0.5 text-xs text-brand-accent">
        Normaal
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[8px] border border-brand-navy bg-brand-navy px-2 py-0.5 text-xs font-medium text-brand-white">
      Prioriteit
    </span>
  );
}
