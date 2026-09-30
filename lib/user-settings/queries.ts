import { createClient } from '@/lib/supabase/server';
import type { ContentSettingsRow } from '@/lib/user-settings/types';

function mapSettings(raw: Record<string, unknown>): ContentSettingsRow | null {
  if (typeof raw.user_id !== 'string') {
    if (typeof raw.id !== 'string') return null;
  }
  const userId =
    typeof raw.user_id === 'string' ? raw.user_id : String(raw.id ?? '');
  if (!userId) return null;

  return {
    id: typeof raw.id === 'string' ? raw.id : userId,
    user_id: userId,
    brand_name: typeof raw.brand_name === 'string' ? raw.brand_name : null,
    brand_description:
      typeof raw.brand_description === 'string' ? raw.brand_description : null,
    brand_voice: typeof raw.brand_voice === 'string' ? raw.brand_voice : null,
    target_audience:
      typeof raw.target_audience === 'string' ? raw.target_audience : null,
    scheduling_mode:
      typeof raw.scheduling_mode === 'string' ? raw.scheduling_mode : null,
    generation_timezone:
      typeof raw.generation_timezone === 'string'
        ? raw.generation_timezone
        : null,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
  };
}

const SETTINGS_SELECT = `
  id, user_id, brand_name, brand_description, brand_voice, target_audience,
  scheduling_mode, generation_timezone, updated_at
`;

export async function getContentSettings(
  userId: string,
): Promise<{ row: ContentSettingsRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('content_settings')
    .select(SETTINGS_SELECT)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[user-settings] get failed:', error.message);
    if (
      error.message.includes('content_settings') ||
      error.message.includes('schema cache')
    ) {
      return {
        row: null,
        error:
          'Tabel content_settings ontbreekt of RLS blokkeert. Voer supabase/migrations/20260929_user_admin_manage_rls.sql uit.',
      };
    }
    return { row: null, error: 'Contentinstellingen konden niet worden geladen.' };
  }

  if (!data) return { row: null, error: null };
  return {
    row: mapSettings(data as Record<string, unknown>),
    error: null,
  };
}
