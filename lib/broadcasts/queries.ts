import { createClient } from '@/lib/supabase/server';
import type { BroadcastRow } from '@/lib/broadcasts/types';

export type BroadcastFilters = {
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

export async function listBroadcasts(
  filters: BroadcastFilters,
): Promise<{ rows: BroadcastRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('broadcast_notifications')
    .select(
      'id, title, message, link_url, link_label, scheduled_for, dispatched_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status === 'sent') {
    query = query.not('dispatched_at', 'is', null);
  } else if (filters.status === 'pending') {
    query = query.is('dispatched_at', null);
  }

  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(`title.ilike.${pattern},message.ilike.${pattern}`);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[broadcasts] list failed:', error.message);
    return { rows: [], error: 'Broadcasts konden niet worden geladen.' };
  }

  return { rows: (data as BroadcastRow[]) ?? [], error: null };
}

export async function getBroadcastById(
  id: string,
): Promise<{ row: BroadcastRow | null; deliveryCount: number; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('broadcast_notifications')
    .select(
      'id, title, message, link_url, link_label, scheduled_for, dispatched_at, created_at',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[broadcasts] get failed:', error.message);
    return { row: null, deliveryCount: 0, error: 'Broadcast kon niet worden geladen.' };
  }
  if (!data) return { row: null, deliveryCount: 0, error: null };

  let deliveryCount = 0;
  if (data.dispatched_at) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'broadcast_blog')
      .eq('title', data.title);
    deliveryCount = count ?? 0;
  }

  return { row: data as BroadcastRow, deliveryCount, error: null };
}
