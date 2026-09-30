import { createClient } from '@/lib/supabase/server';
import {
  isAccountStatus,
  normalizePlanSlug,
  type RecentPostRow,
  type RecentSupportRow,
  type SubscriptionRow,
  type UsageRow,
  type UserListRow,
  type UserProfileRow,
} from '@/lib/users/types';

export type UserListFilters = {
  q?: string;
  plan?: string;
  status?: string;
};

function mapSubscription(
  raw: unknown,
): UserListRow['subscription'] {
  if (Array.isArray(raw)) {
    const first = raw[0];
    return mapSubscription(first);
  }
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    tier: typeof row.tier === 'string' ? row.tier : null,
    status: typeof row.status === 'string' ? row.status : null,
    current_period_end:
      typeof row.current_period_end === 'string' ? row.current_period_end : null,
  };
}

function mapListRow(raw: Record<string, unknown>): UserListRow | null {
  if (typeof raw.id !== 'string') return null;
  const accountStatus = isAccountStatus(raw.account_status)
    ? raw.account_status
    : 'active';

  return {
    id: raw.id,
    email: typeof raw.email === 'string' ? raw.email : null,
    name: typeof raw.name === 'string' ? raw.name : null,
    company: typeof raw.company === 'string' ? raw.company : null,
    subscription_tier:
      typeof raw.subscription_tier === 'string' ? raw.subscription_tier : null,
    account_status: accountStatus,
    created_at: String(raw.created_at ?? ''),
    subscription: mapSubscription(raw.subscriptions),
  };
}

export async function listUsers(
  filters: UserListFilters,
): Promise<{ rows: UserListRow[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select(
      `
      id,
      email,
      name,
      company,
      subscription_tier,
      account_status,
      created_at,
      subscriptions (
        tier,
        status,
        current_period_end
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(300);

  if (filters.status === 'active' || filters.status === 'blocked') {
    query = query.eq('account_status', filters.status);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[users] list failed:', error.message);
    // Fallback when account_status column not migrated yet
    if (error.message.includes('account_status')) {
      return {
        rows: [],
        error:
          'Kolom account_status ontbreekt. Voer de fase-3 SQL-migratie uit in Supabase.',
      };
    }
    return { rows: [], error: 'Gebruikers konden niet worden geladen.' };
  }

  let rows = (data ?? [])
    .map((item) => mapListRow(item as Record<string, unknown>))
    .filter((row): row is UserListRow => row !== null);

  if (filters.plan && filters.plan !== 'all') {
    const plan = normalizePlanSlug(filters.plan);
    rows = rows.filter((row) => {
      const fromSub = row.subscription?.tier
        ? normalizePlanSlug(row.subscription.tier)
        : null;
      const fromUser = normalizePlanSlug(row.subscription_tier);
      return (fromSub ?? fromUser) === plan;
    });
  }

  return { rows, error: null };
}

export async function getUserProfile(
  userId: string,
): Promise<{ row: UserProfileRow | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        name,
        company,
        subscription_tier,
        account_status,
        created_at,
        phone,
        job_title,
        website,
        industry,
        description,
        language,
        timezone,
        onboarding_completed,
        avatar_url,
        blocked_at,
        blocked_reason
      `,
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[users] get failed:', error.message);
      if (error.message.includes('account_status')) {
        return {
          row: null,
          error:
            'Kolom account_status ontbreekt. Voer de fase-3 SQL-migratie uit in Supabase.',
        };
      }
      return { row: null, error: 'Gebruiker kon niet worden geladen.' };
    }

    if (!data) return { row: null, error: null };

    const raw = data as Record<string, unknown>;
    return {
      row: {
        id: String(raw.id),
        email: typeof raw.email === 'string' ? raw.email : null,
        name: typeof raw.name === 'string' ? raw.name : null,
        company: typeof raw.company === 'string' ? raw.company : null,
        subscription_tier:
          typeof raw.subscription_tier === 'string'
            ? raw.subscription_tier
            : null,
        account_status: isAccountStatus(raw.account_status)
          ? raw.account_status
          : 'active',
        created_at: String(raw.created_at ?? ''),
        phone: typeof raw.phone === 'string' ? raw.phone : null,
        job_title: typeof raw.job_title === 'string' ? raw.job_title : null,
        website: typeof raw.website === 'string' ? raw.website : null,
        industry: typeof raw.industry === 'string' ? raw.industry : null,
        description:
          typeof raw.description === 'string' ? raw.description : null,
        language: typeof raw.language === 'string' ? raw.language : null,
        timezone: typeof raw.timezone === 'string' ? raw.timezone : null,
        onboarding_completed: raw.onboarding_completed === true,
        avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
        blocked_at: typeof raw.blocked_at === 'string' ? raw.blocked_at : null,
        blocked_reason:
          typeof raw.blocked_reason === 'string' ? raw.blocked_reason : null,
      },
      error: null,
    };
  } catch (err) {
    console.error(
      '[users] get unexpected:',
      err instanceof Error ? err.message : 'unknown',
    );
    return { row: null, error: 'Gebruiker kon niet worden geladen.' };
  }
}

export async function getUserSubscription(
  userId: string,
): Promise<{ row: SubscriptionRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, tier, status, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id, created_at, updated_at',
    )
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[users] subscription failed:', error.message);
    return { row: null, error: 'Abonnement kon niet worden geladen.' };
  }

  return { row: (data as SubscriptionRow | null) ?? null, error: null };
}

export async function getUserUsageCurrentMonth(
  userId: string,
): Promise<{ row: UsageRow | null; error: string | null }> {
  const supabase = await createClient();
  const month = new Date().toISOString().slice(0, 7);

  const { data, error } = await supabase
    .from('usage')
    .select(
      'id, user_id, month, posts_used, posts_limit, ai_generations_used, ai_generations_limit, platforms_used, platforms_limit, team_members_used, team_members_limit',
    )
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    console.error('[users] usage failed:', error.message);
    return { row: null, error: 'Verbruik kon niet worden geladen.' };
  }

  return { row: (data as UsageRow | null) ?? null, error: null };
}

export async function listRecentPostsForUser(
  userId: string,
  limit = 8,
): Promise<{ rows: RecentPostRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select('id, title, status, created_at, scheduled_for, published_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[users] posts failed:', error.message);
    return { rows: [], error: 'Posts konden niet worden geladen.' };
  }

  return { rows: (data as RecentPostRow[]) ?? [], error: null };
}

export async function listRecentSupportForUser(
  userId: string,
  limit = 8,
): Promise<{ rows: RecentSupportRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, subject, status, priority, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[users] support failed:', error.message);
    return { rows: [], error: 'Supporttickets konden niet worden geladen.' };
  }

  return { rows: (data as RecentSupportRow[]) ?? [], error: null };
}

export type PostStatusCounts = {
  total: number;
  draft: number;
  awaitingApproval: number;
  scheduled: number;
  published: number;
  failed: number;
};

const emptyCounts = (): PostStatusCounts => ({
  total: 0,
  draft: 0,
  awaitingApproval: 0,
  scheduled: 0,
  published: 0,
  failed: 0,
});

function bumpStatus(counts: PostStatusCounts, status: string | null) {
  const s = String(status ?? '')
    .trim()
    .toLowerCase();
  counts.total += 1;
  if (s === 'draft' || s === 'concept') counts.draft += 1;
  else if (
    s === 'pending_approval' ||
    s === 'awaiting_approval' ||
    s === 'ter_goedkeuring' ||
    s === 'wacht_op_goedkeuring' ||
    s === 'approved' ||
    s === 'goedgekeurd'
  ) {
    counts.awaitingApproval += 1;
  } else if (s === 'scheduled' || s === 'gepland') counts.scheduled += 1;
  else if (s === 'published' || s === 'gepubliceerd') counts.published += 1;
  else if (
    s === 'failed' ||
    s === 'error' ||
    s === 'publication_failed' ||
    s === 'mislukt'
  ) {
    counts.failed += 1;
  }
}

export async function getPostStatusCountsForUser(
  userId: string,
): Promise<{ counts: PostStatusCounts; error: string | null }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('status')
      .eq('user_id', userId)
      .limit(2000);

    if (error) {
      console.error('[users] post counts failed:', error.message);
      return { counts: emptyCounts(), error: 'Poststatussen konden niet worden geladen.' };
    }

    const counts = emptyCounts();
    for (const row of data ?? []) {
      bumpStatus(
        counts,
        typeof (row as { status?: string }).status === 'string'
          ? (row as { status: string }).status
          : null,
      );
    }
    return { counts, error: null };
  } catch (err) {
    console.error(
      '[users] post counts unexpected:',
      err instanceof Error ? err.message : 'unknown',
    );
    return { counts: emptyCounts(), error: 'Poststatussen konden niet worden geladen.' };
  }
}

/** Best-effort last activity from posts / support / usage. */
export async function getUserLastActivityAt(
  userId: string,
): Promise<{ at: string | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const candidates: string[] = [];

    const [posts, support] = await Promise.all([
      supabase
        .from('posts')
        .select('created_at, published_at, scheduled_for')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('support_messages')
        .select('created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const push = (value: unknown) => {
      if (typeof value === 'string' && value) candidates.push(value);
    };

    if (posts.data) {
      const p = posts.data as Record<string, unknown>;
      push(p.published_at);
      push(p.scheduled_for);
      push(p.created_at);
    }
    if (support.data) {
      const s = support.data as Record<string, unknown>;
      push(s.updated_at);
      push(s.created_at);
    }

    if (candidates.length === 0) {
      return { at: null, error: null };
    }

    candidates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return { at: candidates[0] ?? null, error: null };
  } catch (err) {
    console.error(
      '[users] last activity unexpected:',
      err instanceof Error ? err.message : 'unknown',
    );
    return { at: null, error: null };
  }
}
