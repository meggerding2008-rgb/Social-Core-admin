import { createClient } from '@/lib/supabase/server';
import type { AdminRole } from '@/lib/auth/types';

export type AuditLogRow = {
  id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  before_state: unknown;
  after_state: unknown;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditFilters = {
  actorId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  q?: string;
};

export async function listAuditLogs(
  filters: AuditFilters,
): Promise<{ rows: AuditLogRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('admin_audit_logs')
    .select(
      'id, actor_id, action, resource_type, resource_id, before_state, after_state, metadata, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.action) query = query.ilike('action', `%${filters.action.replace(/[%_]/g, '')}%`);
  if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`);

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      query = query.or(
        `action.ilike.%${safe}%,resource_type.ilike.%${safe}%,resource_id.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[audit] list failed:', error.message);
    return { rows: [], error: 'Auditlogs konden niet worden geladen.' };
  }
  return { rows: (data as AuditLogRow[]) ?? [], error: null };
}

export async function listAuditLogsForUser(
  userId: string,
  limit = 150,
): Promise<{ rows: AuditLogRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select(
      'id, actor_id, action, resource_type, resource_id, before_state, after_state, metadata, created_at',
    )
    .or(`resource_id.eq.${userId},action.ilike.user.%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[audit] user list failed:', error.message);
    return { rows: [], error: 'Activiteit kon niet worden geladen.' };
  }

  let rows = (data as AuditLogRow[]) ?? [];

  rows = rows.filter((row) => {
    if (row.resource_id === userId) return true;
    if (row.action.startsWith('user.')) return true;
    if (row.resource_type === 'posts') {
      const after = row.after_state;
      if (after && typeof after === 'object') {
        const uid = (after as Record<string, unknown>).user_id;
        if (uid === userId) return true;
      }
      const meta = row.metadata;
      if (meta?.userId === userId) return true;
    }
    return false;
  });

  return { rows, error: null };
}

export type AdminListRow = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  email?: string | null;
};

export async function listAdminProfiles(): Promise<{
  rows: AdminListRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('user_id, role, is_active, display_name, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admins] list failed:', error.message);
    return { rows: [], error: 'Admins konden niet worden geladen.' };
  }

  return { rows: (data as AdminListRow[]) ?? [], error: null };
}

export async function getAdminProfile(
  userId: string,
): Promise<{ row: AdminListRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('user_id, role, is_active, display_name, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[admins] get failed:', error.message);
    return { row: null, error: 'Admin kon niet worden geladen.' };
  }
  return { row: (data as AdminListRow) ?? null, error: null };
}

export async function countActiveSuperadmins(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('admin_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'superadmin')
    .eq('is_active', true);
  return count ?? 0;
}
