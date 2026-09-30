import { createClient } from '@/lib/supabase/server';
import type { UserTrendRow } from '@/lib/user-trends/types';

export type { UserTrendRow } from '@/lib/user-trends/types';
export { TREND_STATUSES, trendStatusLabel } from '@/lib/user-trends/types';

const TREND_SELECT = `
  id, user_id, platform, title, summary, status, relevance_score,
  opportunity_score, branche, detected_at, expires_at, source_url, updated_at
`;

function mapTrend(raw: Record<string, unknown>): UserTrendRow | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.title !== 'string' ||
    typeof raw.status !== 'string'
  ) {
    return null;
  }
  return {
    id: raw.id,
    user_id: String(raw.user_id ?? ''),
    platform: typeof raw.platform === 'string' ? raw.platform : 'algemeen',
    title: raw.title,
    summary: typeof raw.summary === 'string' ? raw.summary : null,
    status: raw.status,
    relevance_score: Number(raw.relevance_score ?? 0),
    opportunity_score: Number(raw.opportunity_score ?? 0),
    branche: typeof raw.branche === 'string' ? raw.branche : 'alle',
    detected_at: String(raw.detected_at ?? ''),
    expires_at: typeof raw.expires_at === 'string' ? raw.expires_at : null,
    source_url: typeof raw.source_url === 'string' ? raw.source_url : null,
    updated_at: String(raw.updated_at ?? ''),
  };
}

export async function listTrendsForUser(
  userId: string,
): Promise<{ rows: UserTrendRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trend_items')
    .select(TREND_SELECT)
    .eq('user_id', userId)
    .order('detected_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[user-trends] list failed:', error.message);
    return { rows: [], error: 'Trends konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapTrend(item as Record<string, unknown>))
    .filter((row): row is UserTrendRow => row !== null);

  return { rows, error: null };
}
