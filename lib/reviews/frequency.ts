import {
  normalizePlanSlug,
  planLabel,
} from '@/lib/users/types';

/** Review cadence by subscription tier (canonical slugs: silver|gold|diamond). */
export function reviewIntervalDays(tier: string | null | undefined): number {
  const slug = normalizePlanSlug(tier);
  if (slug === 'diamond') return 7;
  if (slug === 'gold') return 30;
  return 90; // silver (and unknown → conservative quarterly)
}

export function reviewFrequencyLabel(tier: string | null | undefined): string {
  const slug = normalizePlanSlug(tier);
  if (slug === 'diamond') return 'Wekelijks (Diamant)';
  if (slug === 'gold') return 'Maandelijks (Goud)';
  return 'Iedere 3 maanden (Zilver)';
}

export function addDays(isoDate: Date, days: number): Date {
  const d = new Date(isoDate.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Next review due date from last sent review (or account start).
 */
export function nextReviewDueDate(input: {
  tier: string | null | undefined;
  lastSentAt: string | null | undefined;
  fallbackStart?: string | null;
}): Date {
  const days = reviewIntervalDays(input.tier);
  const base = input.lastSentAt || input.fallbackStart;
  const start = base ? new Date(base) : new Date();
  if (Number.isNaN(start.getTime())) {
    return addDays(new Date(), days);
  }
  return addDays(start, days);
}

export function formatReviewDue(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export { planLabel, normalizePlanSlug };
