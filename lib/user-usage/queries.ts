import { createClient } from '@/lib/supabase/server';
import type { UsageRow } from '@/lib/users/types';

export async function listUsageHistoryForUser(
  userId: string,
  limit = 12,
): Promise<{ rows: UsageRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('usage')
    .select(
      'id, user_id, month, posts_used, posts_limit, ai_generations_used, ai_generations_limit, platforms_used, platforms_limit, team_members_used, team_members_limit',
    )
    .eq('user_id', userId)
    .order('month', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[user-usage] history failed:', error.message);
    return { rows: [], error: 'Verbruikshistorie kon niet worden geladen.' };
  }

  return { rows: (data as UsageRow[]) ?? [], error: null };
}
