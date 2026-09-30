export type MediaAssetRow = {
  id: string;
  user_id: string;
  post_id: string | null;
  source_type: string | null;
  platform: string | null;
  storage_path: string | null;
  public_url: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  variant_status: string | null;
  created_at: string;
  updated_at: string | null;
};

export const MEDIA_ARCHIVED_STATUS = 'archived';
/** Restore target when asset was previously ready; fallback for unknown prior state. */
export const MEDIA_ACTIVE_STATUS = 'ready';
export const MEDIA_ACTIVE_FALLBACK = 'active';

export function mediaStatusLabel(status: string | null): string {
  if (!status) return '—';
  if (status === MEDIA_ARCHIVED_STATUS) return 'Gearchiveerd';
  if (status === 'ready') return 'Actief';
  if (status === 'active') return 'Actief';
  if (status === 'processing') return 'Verwerken';
  if (status === 'failed') return 'Mislukt';
  return status;
}
