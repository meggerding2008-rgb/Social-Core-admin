import { createClient } from '@/lib/supabase/server';
import type { MediaAssetRow } from '@/lib/user-library/types';

export type MediaListFilters = {
  includeArchived?: boolean;
  q?: string;
};

function mapMedia(raw: Record<string, unknown>): MediaAssetRow | null {
  if (typeof raw.id !== 'string' || typeof raw.user_id !== 'string') return null;
  return {
    id: raw.id,
    user_id: raw.user_id,
    post_id: typeof raw.post_id === 'string' ? raw.post_id : null,
    source_type: typeof raw.source_type === 'string' ? raw.source_type : null,
    platform: typeof raw.platform === 'string' ? raw.platform : null,
    storage_path:
      typeof raw.storage_path === 'string' ? raw.storage_path : null,
    public_url: typeof raw.public_url === 'string' ? raw.public_url : null,
    mime_type: typeof raw.mime_type === 'string' ? raw.mime_type : null,
    file_size_bytes:
      typeof raw.file_size_bytes === 'number' ? raw.file_size_bytes : null,
    width: typeof raw.width === 'number' ? raw.width : null,
    height: typeof raw.height === 'number' ? raw.height : null,
    variant_status:
      typeof raw.variant_status === 'string' ? raw.variant_status : null,
    created_at: String(raw.created_at ?? ''),
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  };
}

const MEDIA_SELECT = `
  id, user_id, post_id, source_type, platform, storage_path, public_url,
  mime_type, file_size_bytes, width, height, variant_status, created_at, updated_at
`;

export async function listMediaForUser(
  userId: string,
  filters: MediaListFilters = {},
): Promise<{ rows: MediaAssetRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('post_media_assets')
    .select(MEDIA_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300);

  if (!filters.includeArchived) {
    query = query.neq('variant_status', 'archived');
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `platform.ilike.${pattern},source_type.ilike.${pattern},mime_type.ilike.${pattern},storage_path.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[user-library] list failed:', error.message);
    if (
      error.message.includes('post_media_assets') ||
      error.message.includes('schema cache')
    ) {
      return {
        rows: [],
        error:
          'Tabel post_media_assets ontbreekt of RLS blokkeert. Voer supabase/migrations/20260929_user_admin_manage_rls.sql uit.',
      };
    }
    return { rows: [], error: 'Mediabibliotheek kon niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapMedia(item as Record<string, unknown>))
    .filter((row): row is MediaAssetRow => row !== null);

  return { rows, error: null };
}
