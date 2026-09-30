import { createClient } from '@/lib/supabase/server';
import type { CompetitorRow } from '@/lib/user-competitors/types';

export type { CompetitorRow } from '@/lib/user-competitors/types';
export { displayCompetitorName } from '@/lib/user-competitors/types';

const COMPETITOR_SELECT = `
  id, user_id, competitor_name, name, website_url, industry, description,
  instagram_url, facebook_url, linkedin_url, pinterest_url, x_url,
  followers, engagement_rate, posts_per_week, growth_rate, top_content_type,
  best_posting_time, analysis_status, updated_at, created_at
`;

function mapCompetitor(raw: Record<string, unknown>): CompetitorRow | null {
  if (typeof raw.id !== 'string' || typeof raw.competitor_name !== 'string') {
    return null;
  }
  return {
    id: raw.id,
    user_id: String(raw.user_id ?? ''),
    competitor_name: raw.competitor_name,
    name: typeof raw.name === 'string' ? raw.name : null,
    website_url: typeof raw.website_url === 'string' ? raw.website_url : null,
    industry: typeof raw.industry === 'string' ? raw.industry : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    instagram_url:
      typeof raw.instagram_url === 'string' ? raw.instagram_url : null,
    facebook_url:
      typeof raw.facebook_url === 'string' ? raw.facebook_url : null,
    linkedin_url:
      typeof raw.linkedin_url === 'string' ? raw.linkedin_url : null,
    pinterest_url:
      typeof raw.pinterest_url === 'string' ? raw.pinterest_url : null,
    x_url: typeof raw.x_url === 'string' ? raw.x_url : null,
    followers: Number(raw.followers ?? 0),
    engagement_rate: Number(raw.engagement_rate ?? 0),
    posts_per_week: Number(raw.posts_per_week ?? 0),
    growth_rate: Number(raw.growth_rate ?? 0),
    top_content_type:
      typeof raw.top_content_type === 'string' ? raw.top_content_type : '',
    best_posting_time:
      typeof raw.best_posting_time === 'string' ? raw.best_posting_time : '',
    analysis_status:
      typeof raw.analysis_status === 'string' ? raw.analysis_status : 'pending',
    updated_at: String(raw.updated_at ?? ''),
    created_at: String(raw.created_at ?? ''),
  };
}

export async function listCompetitorsForUser(
  userId: string,
): Promise<{ rows: CompetitorRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('competitor_data')
    .select(COMPETITOR_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[user-competitors] list failed:', error.message);
    return { rows: [], error: 'Concurrenten konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapCompetitor(item as Record<string, unknown>))
    .filter((row): row is CompetitorRow => row !== null);

  return { rows, error: null };
}

export async function getCompetitorForUser(
  userId: string,
  competitorId: string,
): Promise<{ row: CompetitorRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('competitor_data')
    .select(COMPETITOR_SELECT)
    .eq('user_id', userId)
    .eq('id', competitorId)
    .maybeSingle();

  if (error) {
    console.error('[user-competitors] get failed:', error.message);
    return { row: null, error: 'Concurrent kon niet worden geladen.' };
  }
  if (!data) return { row: null, error: null };
  return {
    row: mapCompetitor(data as Record<string, unknown>),
    error: null,
  };
}
