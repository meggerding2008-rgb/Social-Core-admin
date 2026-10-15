import {
  paymentIssueBadgeLabel,
  type PaymentIssueBadge as BadgeKind,
} from '@/lib/user-billing/payment-labels';

const STYLES: Record<BadgeKind, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  payment_failed: 'border-red-200 bg-red-50 text-red-900',
  payment_open: 'border-amber-200 bg-amber-50 text-amber-950',
  paused: 'border-amber-200 bg-amber-50 text-amber-950',
  none: 'border-brand-border bg-brand-mist text-brand-accent',
};

export function PaymentIssueBadge({ badge }: { badge: BadgeKind }) {
  return (
    <span
      className={`inline-flex rounded-[8px] border px-2 py-0.5 text-xs font-medium ${STYLES[badge]}`}
    >
      {paymentIssueBadgeLabel(badge)}
    </span>
  );
}
