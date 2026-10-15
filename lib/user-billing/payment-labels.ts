export type PaymentIssueBadge =
  | 'active'
  | 'payment_failed'
  | 'payment_open'
  | 'paused'
  | 'none';

export function paymentIssueBadgeLabel(badge: PaymentIssueBadge): string {
  switch (badge) {
    case 'active':
      return 'Actief';
    case 'payment_failed':
      return 'Betaling mislukt';
    case 'payment_open':
      return 'Betaling openstaand';
    case 'paused':
      return 'Gepauzeerd';
    case 'none':
    default:
      return 'Geen actief abonnement';
  }
}

export function isPaymentIssueStatus(status: string | null | undefined): boolean {
  const s = String(status ?? '').toLowerCase();
  return (
    s === 'paused' ||
    s === 'past_due' ||
    s === 'unpaid' ||
    s === 'incomplete' ||
    s === 'incomplete_expired'
  );
}

export function formatMoneyCents(
  amountCents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amountCents == null || Number.isNaN(amountCents)) return '—';
  const cur = (currency || 'eur').toUpperCase();
  try {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: cur,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${cur}`;
  }
}
