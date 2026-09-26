import { createClient } from '@/lib/supabase/server';
import type { FaqItemRow, VideoTutorialRow } from '@/lib/content/types';

export type CmsListFilters = {
  q?: string;
  category?: string;
  published?: string;
};

function mapFaq(raw: Record<string, unknown>): FaqItemRow | null {
  if (typeof raw.id !== 'string') return null;
  if (typeof raw.question !== 'string' || typeof raw.answer !== 'string') return null;
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    display_order: Number(raw.display_order ?? 0),
    category: typeof raw.category === 'string' ? raw.category : null,
    is_published: raw.is_published !== false,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? raw.created_at ?? ''),
  };
}

function mapVideo(raw: Record<string, unknown>): VideoTutorialRow | null {
  if (typeof raw.id !== 'string') return null;
  if (typeof raw.title !== 'string') return null;
  return {
    id: raw.id,
    title: raw.title,
    thumbnail_url: typeof raw.thumbnail_url === 'string' ? raw.thumbnail_url : '',
    duration: typeof raw.duration === 'string' ? raw.duration : '',
    video_url: typeof raw.video_url === 'string' ? raw.video_url : '',
    description: typeof raw.description === 'string' ? raw.description : null,
    display_order: Number(raw.display_order ?? 0),
    category: typeof raw.category === 'string' ? raw.category : null,
    is_published: raw.is_published !== false,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? raw.created_at ?? ''),
  };
}

export async function listFaqItems(
  filters: CmsListFilters,
): Promise<{ rows: FaqItemRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('faq_items')
    .select(
      'id, question, answer, display_order, category, is_published, created_at, updated_at',
    )
    .order('display_order', { ascending: true })
    .limit(300);

  if (filters.published === 'yes') query = query.eq('is_published', true);
  if (filters.published === 'no') query = query.eq('is_published', false);
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `question.ilike.${pattern},answer.ilike.${pattern},category.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[cms] faq list failed:', error.message);
    if (error.message.includes('is_published') || error.message.includes('category')) {
      return {
        rows: [],
        error: 'CMS-kolommen ontbreken. Voer de fase-5 SQL-migratie uit in Supabase.',
      };
    }
    return { rows: [], error: 'FAQ’s konden niet worden geladen.' };
  }

  return {
    rows: (data ?? [])
      .map((item) => mapFaq(item as Record<string, unknown>))
      .filter((row): row is FaqItemRow => row !== null),
    error: null,
  };
}

export async function getFaqItemById(
  id: string,
): Promise<{ row: FaqItemRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('faq_items')
    .select(
      'id, question, answer, display_order, category, is_published, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[cms] faq get failed:', error.message);
    return { row: null, error: 'FAQ kon niet worden geladen.' };
  }
  if (!data) return { row: null, error: null };
  return { row: mapFaq(data as Record<string, unknown>), error: null };
}

export async function listVideoTutorials(
  filters: CmsListFilters,
): Promise<{ rows: VideoTutorialRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('video_tutorials')
    .select(
      'id, title, thumbnail_url, duration, video_url, description, display_order, category, is_published, created_at, updated_at',
    )
    .order('display_order', { ascending: true })
    .limit(300);

  if (filters.published === 'yes') query = query.eq('is_published', true);
  if (filters.published === 'no') query = query.eq('is_published', false);
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `title.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern},video_url.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[cms] videos list failed:', error.message);
    if (
      error.message.includes('is_published') ||
      error.message.includes('category') ||
      error.message.includes('description')
    ) {
      return {
        rows: [],
        error: 'CMS-kolommen ontbreken. Voer de fase-5 SQL-migratie uit in Supabase.',
      };
    }
    return { rows: [], error: 'Video’s konden niet worden geladen.' };
  }

  return {
    rows: (data ?? [])
      .map((item) => mapVideo(item as Record<string, unknown>))
      .filter((row): row is VideoTutorialRow => row !== null),
    error: null,
  };
}

export async function getVideoTutorialById(
  id: string,
): Promise<{ row: VideoTutorialRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('video_tutorials')
    .select(
      'id, title, thumbnail_url, duration, video_url, description, display_order, category, is_published, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[cms] video get failed:', error.message);
    return { row: null, error: 'Video kon niet worden geladen.' };
  }
  if (!data) return { row: null, error: null };
  return { row: mapVideo(data as Record<string, unknown>), error: null };
}

export async function listFaqCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('faq_items')
    .select('category')
    .not('category', 'is', null)
    .limit(200);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as { category?: string | null }).category?.trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl'));
}

export async function listVideoCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('video_tutorials')
    .select('category')
    .not('category', 'is', null)
    .limit(200);
  const set = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as { category?: string | null }).category?.trim();
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'nl'));
}
