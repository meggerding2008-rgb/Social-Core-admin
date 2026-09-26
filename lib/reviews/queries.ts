import { createClient } from '@/lib/supabase/server';
import {
  isReviewStatus,
  type ContentReviewRow,
  type ReviewUserSummary,
} from '@/lib/reviews/types';
import {
  nextReviewDueDate,
  normalizePlanSlug,
  reviewFrequencyLabel,
  reviewIntervalDays,
} from '@/lib/reviews/frequency';

export type ReviewListFilters = {
  status?: string;
  userId?: string;
  tier?: string;
  from?: string;
  to?: string;
  q?: string;
};

export type UserReviewSchedule = {
  userId: string;
  label: string;
  email: string | null;
  tier: string;
  tierLabel: string;
  frequencyLabel: string;
  lastSentAt: string | null;
  nextDue: string;
  nextDueDate: Date;
  overdue: boolean;
  dueSoon: boolean;
};

function mapUser(raw: unknown): ReviewUserSummary | null {
  if (Array.isArray(raw)) return mapUser(raw[0]);
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    id: String(row.id ?? ''),
    email: typeof row.email === 'string' ? row.email : null,
    name: typeof row.name === 'string' ? row.name : null,
    company: typeof row.company === 'string' ? row.company : null,
    subscription_tier:
      typeof row.subscription_tier === 'string' ? row.subscription_tier : null,
  };
}

function mapReview(raw: Record<string, unknown>): ContentReviewRow | null {
  if (typeof raw.id !== 'string' || typeof raw.user_id !== 'string') return null;
  if (typeof raw.title !== 'string' || typeof raw.feedback !== 'string') return null;

  // Legacy statuses after incomplete migration
  let statusRaw = raw.status;
  if (statusRaw === 'gepubliceerd') statusRaw = 'verzonden';
  if (statusRaw === 'gearchiveerd') statusRaw = 'geannuleerd';
  const status = isReviewStatus(statusRaw) ? statusRaw : 'concept';

  return {
    id: raw.id,
    user_id: raw.user_id,
    title: raw.title,
    review_date: String(raw.review_date ?? ''),
    feedback: raw.feedback,
    score: typeof raw.score === 'string' ? raw.score : null,
    status,
    subscription_tier:
      typeof raw.subscription_tier === 'string' ? raw.subscription_tier : null,
    period_start: typeof raw.period_start === 'string' ? raw.period_start : null,
    period_end: typeof raw.period_end === 'string' ? raw.period_end : null,
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    what_went_well:
      typeof raw.what_went_well === 'string' ? raw.what_went_well : null,
    improvement_points:
      typeof raw.improvement_points === 'string'
        ? raw.improvement_points
        : null,
    performance_analysis:
      typeof raw.performance_analysis === 'string'
        ? raw.performance_analysis
        : null,
    recommendations:
      typeof raw.recommendations === 'string' ? raw.recommendations : null,
    recommended_content_types:
      typeof raw.recommended_content_types === 'string'
        ? raw.recommended_content_types
        : null,
    recommended_posting_frequency:
      typeof raw.recommended_posting_frequency === 'string'
        ? raw.recommended_posting_frequency
        : null,
    platform_recommendations:
      typeof raw.platform_recommendations === 'string'
        ? raw.platform_recommendations
        : null,
    conclusion: typeof raw.conclusion === 'string' ? raw.conclusion : null,
    scheduled_for:
      typeof raw.scheduled_for === 'string' ? raw.scheduled_for : null,
    sent_at: typeof raw.sent_at === 'string' ? raw.sent_at : null,
    created_by: typeof raw.created_by === 'string' ? raw.created_by : null,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? raw.created_at ?? ''),
    users: mapUser(raw.users),
  };
}

const REVIEW_SELECT = `
  id,
  user_id,
  title,
  review_date,
  feedback,
  score,
  status,
  subscription_tier,
  period_start,
  period_end,
  summary,
  what_went_well,
  improvement_points,
  performance_analysis,
  recommendations,
  recommended_content_types,
  recommended_posting_frequency,
  platform_recommendations,
  conclusion,
  scheduled_for,
  sent_at,
  created_by,
  created_at,
  updated_at,
  users:user_id (
    id,
    email,
    name,
    company,
    subscription_tier
  )
`;

export async function listContentReviews(
  filters: ReviewListFilters,
): Promise<{ rows: ContentReviewRow[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('content_reviews')
    .select(REVIEW_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all' && isReviewStatus(filters.status)) {
    query = query.eq('status', filters.status);
  }

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.tier && filters.tier !== 'all') {
    const slug = normalizePlanSlug(filters.tier);
    query = query.eq('subscription_tier', slug);
  }

  if (filters.from) {
    query = query.gte('scheduled_for', `${filters.from}T00:00:00.000Z`);
  }

  if (filters.to) {
    query = query.lte('scheduled_for', `${filters.to}T23:59:59.999Z`);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `title.ilike.${pattern},summary.ilike.${pattern},feedback.ilike.${pattern},conclusion.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[reviews] list failed:', error.message);
    if (
      error.message.includes('period_start') ||
      error.message.includes('what_went_well') ||
      error.message.includes('scheduled_for')
    ) {
      return {
        rows: [],
        error:
          'Reviewkolommen ontbreken. Voer supabase/migrations/20260926_phase10_periodic_reviews.sql uit in Supabase.',
      };
    }
    return { rows: [], error: 'Reviews konden niet worden geladen.' };
  }

  let rows = (data ?? [])
    .map((item) => mapReview(item as Record<string, unknown>))
    .filter((row): row is ContentReviewRow => row !== null);

  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((row) => {
      const hay = [
        row.title,
        row.summary,
        row.feedback,
        row.users?.email,
        row.users?.name,
        row.subscription_tier,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  return { rows, error: null };
}

export async function getContentReviewById(
  id: string,
): Promise<{ row: ContentReviewRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('content_reviews')
    .select(REVIEW_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[reviews] get failed:', error.message);
    return { row: null, error: 'Review kon niet worden geladen.' };
  }

  if (!data) return { row: null, error: null };
  return { row: mapReview(data as Record<string, unknown>), error: null };
}

export async function listUsersForReviewSelect(): Promise<
  {
    id: string;
    label: string;
    tier: string;
    email: string | null;
  }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      name,
      email,
      company,
      subscription_tier,
      created_at,
      subscriptions (
        tier,
        status
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[reviews] users select failed:', error.message);
    return [];
  }

  return (data ?? []).map((u) => {
    const row = u as Record<string, unknown>;
    const subs = row.subscriptions;
    let subTier: string | null = null;
    if (Array.isArray(subs) && subs[0] && typeof subs[0] === 'object') {
      const s = subs[0] as Record<string, unknown>;
      if (typeof s.tier === 'string') subTier = s.tier;
    } else if (subs && typeof subs === 'object') {
      const s = subs as Record<string, unknown>;
      if (typeof s.tier === 'string') subTier = s.tier;
    }
    const tier = normalizePlanSlug(
      subTier ||
        (typeof row.subscription_tier === 'string'
          ? row.subscription_tier
          : 'silver'),
    );
    const name = typeof row.name === 'string' ? row.name : null;
    const email = typeof row.email === 'string' ? row.email : null;
    const company = typeof row.company === 'string' ? row.company : null;
    const label = [name, email, company, reviewFrequencyLabel(tier)]
      .filter(Boolean)
      .join(' · ');
    return {
      id: String(row.id),
      label: label || String(row.id),
      tier,
      email,
    };
  });
}

/** Users whose next periodic review is overdue or due within `soonDays`. */
export async function listUsersNeedingReviews(options?: {
  soonDays?: number;
  limit?: number;
}): Promise<UserReviewSchedule[]> {
  const soonDays = options?.soonDays ?? 14;
  const limit = options?.limit ?? 100;
  const supabase = await createClient();

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(
      `
      id,
      name,
      email,
      company,
      subscription_tier,
      created_at,
      account_status,
      subscriptions (
        tier,
        status
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (usersError || !users) {
    console.error('[reviews] schedule users failed:', usersError?.message);
    return [];
  }

  const { data: sentReviews } = await supabase
    .from('content_reviews')
    .select('user_id, sent_at, created_at, status')
    .in('status', ['verzonden', 'gepubliceerd'])
    .order('sent_at', { ascending: false })
    .limit(2000);

  const lastSent = new Map<string, string>();
  for (const raw of sentReviews ?? []) {
    const row = raw as Record<string, unknown>;
    const uid = typeof row.user_id === 'string' ? row.user_id : '';
    if (!uid || lastSent.has(uid)) continue;
    const when =
      (typeof row.sent_at === 'string' && row.sent_at) ||
      (typeof row.created_at === 'string' && row.created_at) ||
      null;
    if (when) lastSent.set(uid, when);
  }

  const now = Date.now();
  const soonMs = soonDays * 24 * 60 * 60 * 1000;
  const out: UserReviewSchedule[] = [];

  for (const u of users) {
    const row = u as Record<string, unknown>;
    if (row.account_status === 'blocked') continue;

    const subs = row.subscriptions;
    let subTier: string | null = null;
    let subStatus: string | null = null;
    const first = Array.isArray(subs) ? subs[0] : subs;
    if (first && typeof first === 'object') {
      const s = first as Record<string, unknown>;
      if (typeof s.tier === 'string') subTier = s.tier;
      if (typeof s.status === 'string') subStatus = s.status;
    }
    if (subStatus && !['active', 'trialing'].includes(subStatus.toLowerCase())) {
      // Still include if user has a tier on profile
    }

    const tier = normalizePlanSlug(
      subTier ||
        (typeof row.subscription_tier === 'string'
          ? row.subscription_tier
          : 'silver'),
    );
    const last = lastSent.get(String(row.id)) ?? null;
    const due = nextReviewDueDate({
      tier,
      lastSentAt: last,
      fallbackStart:
        typeof row.created_at === 'string' ? row.created_at : undefined,
    });
    const dueMs = due.getTime();
    const overdue = dueMs <= now;
    const dueSoon = !overdue && dueMs - now <= soonMs;
    if (!overdue && !dueSoon) continue;

    const name = typeof row.name === 'string' ? row.name : null;
    const email = typeof row.email === 'string' ? row.email : null;
    out.push({
      userId: String(row.id),
      label: name || email || String(row.id),
      email,
      tier,
      tierLabel: reviewFrequencyLabel(tier).replace(/ \(.+\)$/, ''),
      frequencyLabel: reviewFrequencyLabel(tier),
      lastSentAt: last,
      nextDue: due.toISOString(),
      nextDueDate: due,
      overdue,
      dueSoon,
    });
  }

  out.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());
  return out.slice(0, limit);
}

export async function getUserReviewSchedule(
  userId: string,
): Promise<UserReviewSchedule | null> {
  const all = await listUsersNeedingReviews({ soonDays: 3650, limit: 500 });
  const hit = all.find((u) => u.userId === userId);
  if (hit) return hit;

  // Not overdue/soon — still compute for display
  const supabase = await createClient();
  const { data: user } = await supabase
    .from('users')
    .select(
      `
      id, name, email, subscription_tier, created_at,
      subscriptions ( tier, status )
    `,
    )
    .eq('id', userId)
    .maybeSingle();
  if (!user) return null;

  const row = user as Record<string, unknown>;
  const first = Array.isArray(row.subscriptions)
    ? row.subscriptions[0]
    : row.subscriptions;
  let subTier: string | null = null;
  if (first && typeof first === 'object') {
    const s = first as Record<string, unknown>;
    if (typeof s.tier === 'string') subTier = s.tier;
  }
  const tier = normalizePlanSlug(
    subTier ||
      (typeof row.subscription_tier === 'string'
        ? row.subscription_tier
        : 'silver'),
  );

  const { data: lastRow } = await supabase
    .from('content_reviews')
    .select('sent_at, created_at')
    .eq('user_id', userId)
    .in('status', ['verzonden', 'gepubliceerd'])
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const last =
    (lastRow &&
      typeof (lastRow as { sent_at?: string }).sent_at === 'string' &&
      (lastRow as { sent_at: string }).sent_at) ||
    (lastRow &&
      typeof (lastRow as { created_at?: string }).created_at === 'string' &&
      (lastRow as { created_at: string }).created_at) ||
    null;

  const due = nextReviewDueDate({
    tier,
    lastSentAt: last,
    fallbackStart:
      typeof row.created_at === 'string' ? row.created_at : undefined,
  });
  const now = Date.now();

  return {
    userId,
    label:
      (typeof row.name === 'string' && row.name) ||
      (typeof row.email === 'string' && row.email) ||
      userId,
    email: typeof row.email === 'string' ? row.email : null,
    tier,
    tierLabel: tier,
    frequencyLabel: reviewFrequencyLabel(tier),
    lastSentAt: last,
    nextDue: due.toISOString(),
    nextDueDate: due,
    overdue: due.getTime() <= now,
    dueSoon:
      due.getTime() > now &&
      due.getTime() - now <= reviewIntervalDays(tier) * 24 * 60 * 60 * 1000,
  };
}
