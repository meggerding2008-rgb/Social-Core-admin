import type { AdminRole } from '@/lib/auth/types';

/** Workflow statuses after phase-10 migration. */
export const REVIEW_STATUSES = [
  'concept',
  'gepland',
  'verzonden',
  'geannuleerd',
] as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewUserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  subscription_tier: string | null;
};

export type ContentReviewRow = {
  id: string;
  user_id: string;
  title: string;
  /** Legacy DATE — kept for user-app + NOT NULL constraint. */
  review_date: string;
  /** Legacy body — composed from structured fields for user-app. */
  feedback: string;
  score: string | null;
  status: ReviewStatus;
  subscription_tier: string | null;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  what_went_well: string | null;
  improvement_points: string | null;
  performance_analysis: string | null;
  recommendations: string | null;
  recommended_content_types: string | null;
  recommended_posting_frequency: string | null;
  platform_recommendations: string | null;
  conclusion: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  users: ReviewUserSummary | null;
};

export function canReadReviews(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'content' ||
    role === 'support' ||
    role === 'viewer'
  );
}

export function canMutateReviews(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    typeof value === 'string' &&
    (REVIEW_STATUSES as readonly string[]).includes(value)
  );
}

export function reviewStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case 'concept':
      return 'Concept';
    case 'gepland':
      return 'Gepland';
    case 'verzonden':
      return 'Verzonden';
    case 'geannuleerd':
      return 'Geannuleerd';
    default:
      return status;
  }
}

/** Compose legacy `feedback` so the user-app Support page still shows content. */
export function composeReviewFeedback(parts: {
  summary?: string | null;
  whatWentWell?: string | null;
  improvementPoints?: string | null;
  performanceAnalysis?: string | null;
  recommendations?: string | null;
  recommendedContentTypes?: string | null;
  recommendedPostingFrequency?: string | null;
  platformRecommendations?: string | null;
  conclusion?: string | null;
}): string {
  const blocks: string[] = [];
  const push = (label: string, value?: string | null) => {
    const t = value?.trim();
    if (t) blocks.push(`${label}\n${t}`);
  };
  push('Samenvatting', parts.summary);
  push('Wat ging goed', parts.whatWentWell);
  push('Wat beter kan', parts.improvementPoints);
  push('Analyse contentprestaties', parts.performanceAnalysis);
  push('Aanbevelingen (likes, reacties, bereik)', parts.recommendations);
  push('Aanbevolen contenttypes', parts.recommendedContentTypes);
  push('Aanbevolen postingfrequentie', parts.recommendedPostingFrequency);
  push('Platformspecifieke aanbevelingen', parts.platformRecommendations);
  push('Conclusie', parts.conclusion);
  return blocks.join('\n\n').trim() || 'Periodieke contentreview.';
}
