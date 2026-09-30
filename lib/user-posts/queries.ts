import { createClient } from '@/lib/supabase/server';
import type { UserPostRow } from '@/lib/user-posts/types';

export type PostListFilters = {
  status?: string;
  q?: string;
};

function mapPost(raw: Record<string, unknown>): UserPostRow | null {
  if (typeof raw.id !== 'string' || typeof raw.user_id !== 'string') return null;
  let platforms: string[] | null = null;
  if (Array.isArray(raw.platforms)) {
    platforms = raw.platforms.map(String);
  } else if (typeof raw.platforms === 'string') {
    try {
      const parsed = JSON.parse(raw.platforms);
      platforms = Array.isArray(parsed) ? parsed.map(String) : [raw.platforms];
    } catch {
      platforms = [raw.platforms];
    }
  }

  return {
    id: raw.id,
    user_id: raw.user_id,
    title: typeof raw.title === 'string' ? raw.title : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    image_url: typeof raw.image_url === 'string' ? raw.image_url : null,
    platforms,
    status: typeof raw.status === 'string' ? raw.status : null,
    hashtags: typeof raw.hashtags === 'string' ? raw.hashtags : null,
    scheduled_for:
      typeof raw.scheduled_for === 'string' ? raw.scheduled_for : null,
    published_at:
      typeof raw.published_at === 'string' ? raw.published_at : null,
    created_at: String(raw.created_at ?? ''),
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    is_favorite: raw.is_favorite === true,
    x_publish_error:
      typeof raw.x_publish_error === 'string' ? raw.x_publish_error : null,
    linkedin_publish_error:
      typeof raw.linkedin_publish_error === 'string'
        ? raw.linkedin_publish_error
        : null,
    facebook_publish_error:
      typeof raw.facebook_publish_error === 'string'
        ? raw.facebook_publish_error
        : null,
    instagram_publish_error:
      typeof raw.instagram_publish_error === 'string'
        ? raw.instagram_publish_error
        : null,
    threads_publish_error:
      typeof raw.threads_publish_error === 'string'
        ? raw.threads_publish_error
        : null,
  };
}

const POST_SELECT = `
  id, user_id, title, description, image_url, platforms, status, hashtags,
  scheduled_for, published_at, created_at, updated_at, is_favorite,
  x_publish_error, linkedin_publish_error, facebook_publish_error,
  instagram_publish_error, threads_publish_error
`;

export async function listPostsForUser(
  userId: string,
  filters: PostListFilters = {},
): Promise<{ rows: UserPostRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(300);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `title.ilike.${pattern},description.ilike.${pattern},hashtags.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[user-posts] list failed:', error.message);
    return { rows: [], error: 'Posts konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapPost(item as Record<string, unknown>))
    .filter((row): row is UserPostRow => row !== null);

  return { rows, error: null };
}

export async function listScheduledPostsForUser(
  userId: string,
): Promise<{ rows: UserPostRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('user_id', userId)
    .not('scheduled_for', 'is', null)
    .order('scheduled_for', { ascending: true })
    .limit(500);

  if (error) {
    console.error('[user-posts] calendar failed:', error.message);
    return { rows: [], error: 'Kalender kon niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapPost(item as Record<string, unknown>))
    .filter((row): row is UserPostRow => row !== null);

  return { rows, error: null };
}

export async function getPostForUser(
  userId: string,
  postId: string,
): Promise<{ row: UserPostRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('user_id', userId)
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    console.error('[user-posts] get failed:', error.message);
    return { row: null, error: 'Post kon niet worden geladen.' };
  }
  if (!data) return { row: null, error: null };
  return { row: mapPost(data as Record<string, unknown>), error: null };
}

export async function countFailedPublications(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .or(
      'facebook_publish_error.not.is.null,instagram_publish_error.not.is.null,threads_publish_error.not.is.null,x_publish_error.not.is.null,linkedin_publish_error.not.is.null,status.eq.mislukt',
    );
  if (error) {
    console.error('[user-posts] failed count:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function countPostsAwaitingAction(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .in('status', ['concept', 'goedgekeurd']);
  if (error) {
    console.error('[user-posts] awaiting count:', error.message);
    return 0;
  }
  return count ?? 0;
}
