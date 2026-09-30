import { createClient } from '@/lib/supabase/server';

export type SocialAccountMetricRow = {
  platform: string;
  platform_account_id: string | null;
  metric_date: string;
  followers: number | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  updated_at: string;
};

export type PostMetricRow = {
  id: string;
  post_id: string;
  platform: string;
  external_post_id: string | null;
  metric_date: string;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  engagement_rate: number | null;
  updated_at: string;
};

export type PlatformConnectionRow = {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string | null;
  platform_username: string | null;
  connected_at: string;
  updated_at: string;
  organization_name: string | null;
};

const ACCOUNT_METRICS_SELECT = `
  platform, platform_account_id, metric_date, followers, reach, impressions,
  likes, comments, shares, saves, clicks, engagement_rate, updated_at
`;

const POST_METRICS_SELECT = `
  id, post_id, platform, external_post_id, metric_date, reach, impressions,
  likes, comments, shares, saves, clicks, engagement_rate, updated_at
`;

const CONNECTION_SELECT =
  'id, user_id, platform, platform_user_id, platform_username, connected_at, updated_at, organization_name';

function mapAccountMetric(raw: Record<string, unknown>): SocialAccountMetricRow | null {
  if (typeof raw.platform !== 'string' || typeof raw.metric_date !== 'string') {
    return null;
  }
  return {
    platform: raw.platform,
    platform_account_id:
      typeof raw.platform_account_id === 'string' ? raw.platform_account_id : null,
    metric_date: raw.metric_date,
    followers: typeof raw.followers === 'number' ? raw.followers : null,
    reach: typeof raw.reach === 'number' ? raw.reach : null,
    impressions: typeof raw.impressions === 'number' ? raw.impressions : null,
    likes: typeof raw.likes === 'number' ? raw.likes : null,
    comments: typeof raw.comments === 'number' ? raw.comments : null,
    shares: typeof raw.shares === 'number' ? raw.shares : null,
    saves: typeof raw.saves === 'number' ? raw.saves : null,
    clicks: typeof raw.clicks === 'number' ? raw.clicks : null,
    engagement_rate:
      raw.engagement_rate != null ? Number(raw.engagement_rate) : null,
    updated_at: String(raw.updated_at ?? ''),
  };
}

function mapPostMetric(raw: Record<string, unknown>): PostMetricRow | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.post_id !== 'string' ||
    typeof raw.platform !== 'string' ||
    typeof raw.metric_date !== 'string'
  ) {
    return null;
  }
  return {
    id: raw.id,
    post_id: raw.post_id,
    platform: raw.platform,
    external_post_id:
      typeof raw.external_post_id === 'string' ? raw.external_post_id : null,
    metric_date: raw.metric_date,
    reach: typeof raw.reach === 'number' ? raw.reach : null,
    impressions: typeof raw.impressions === 'number' ? raw.impressions : null,
    likes: typeof raw.likes === 'number' ? raw.likes : null,
    comments: typeof raw.comments === 'number' ? raw.comments : null,
    shares: typeof raw.shares === 'number' ? raw.shares : null,
    saves: typeof raw.saves === 'number' ? raw.saves : null,
    clicks: typeof raw.clicks === 'number' ? raw.clicks : null,
    engagement_rate:
      raw.engagement_rate != null ? Number(raw.engagement_rate) : null,
    updated_at: String(raw.updated_at ?? ''),
  };
}

/** Latest metric row per platform (most recent metric_date). */
export async function listMetricsForUser(
  userId: string,
): Promise<{ rows: SocialAccountMetricRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('social_account_metrics')
    .select(ACCOUNT_METRICS_SELECT)
    .eq('user_id', userId)
    .order('metric_date', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(400);

  if (error) {
    console.error('[user-stats] account metrics failed:', error.message);
    return {
      rows: [],
      error: 'Accountstatistieken konden niet worden geladen.',
    };
  }

  const byKey = new Map<string, SocialAccountMetricRow>();
  for (const item of data ?? []) {
    const row = mapAccountMetric(item as Record<string, unknown>);
    if (!row) continue;
    const key = `${row.platform}::${row.platform_account_id ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }

  const rows = Array.from(byKey.values()).sort((a, b) =>
    a.platform.localeCompare(b.platform),
  );
  return { rows, error: null };
}

export async function listPostMetricsForUser(
  userId: string,
): Promise<{ rows: PostMetricRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('post_metrics')
    .select(POST_METRICS_SELECT)
    .eq('user_id', userId)
    .order('metric_date', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[user-stats] post metrics failed:', error.message);
    return { rows: [], error: 'Poststatistieken konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapPostMetric(item as Record<string, unknown>))
    .filter((row): row is PostMetricRow => row !== null);

  return { rows, error: null };
}

export async function listConnectedPlatforms(
  userId: string,
): Promise<{ rows: PlatformConnectionRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('platform_connections')
    .select(CONNECTION_SELECT)
    .eq('user_id', userId)
    .order('platform', { ascending: true });

  if (error) {
    console.error('[user-stats] connections failed:', error.message);
    return { rows: [], error: 'Platformkoppelingen konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => {
      const raw = item as Record<string, unknown>;
      if (typeof raw.id !== 'string' || typeof raw.platform !== 'string') {
        return null;
      }
      return {
        id: raw.id,
        user_id: String(raw.user_id ?? userId),
        platform: raw.platform,
        platform_user_id:
          typeof raw.platform_user_id === 'string' ? raw.platform_user_id : null,
        platform_username:
          typeof raw.platform_username === 'string'
            ? raw.platform_username
            : null,
        connected_at: String(raw.connected_at ?? ''),
        updated_at: String(raw.updated_at ?? ''),
        organization_name:
          typeof raw.organization_name === 'string'
            ? raw.organization_name
            : null,
      } satisfies PlatformConnectionRow;
    })
    .filter((row): row is PlatformConnectionRow => row !== null);

  return { rows, error: null };
}

export async function getLastMetricsSync(
  userId: string,
): Promise<{ at: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('social_account_metrics')
    .select('updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[user-stats] last sync failed:', error.message);
    return { at: null, error: 'Laatste sync kon niet worden bepaald.' };
  }

  const at =
    data && typeof (data as { updated_at?: unknown }).updated_at === 'string'
      ? (data as { updated_at: string }).updated_at
      : null;
  return { at, error: null };
}
