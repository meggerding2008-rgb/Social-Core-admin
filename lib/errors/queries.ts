import { createClient } from '@/lib/supabase/server';
import {
  isErrorSeverity,
  isErrorStatus,
  type ErrorReportRow,
} from '@/lib/errors/types';

export type ErrorFilters = {
  status?: string;
  severity?: string;
  source?: string;
  q?: string;
};

export async function listErrorReports(
  filters: ErrorFilters,
): Promise<{ rows: ErrorReportRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('error_reports')
    .select(
      `
      id, source, severity, status, message, stack, url, user_id,
      assignee_admin_id, context, resolved_at, resolved_by, created_at, updated_at,
      users:user_id ( id, email, name )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all' && isErrorStatus(filters.status)) {
    query = query.eq('status', filters.status);
  }
  if (
    filters.severity &&
    filters.severity !== 'all' &&
    isErrorSeverity(filters.severity)
  ) {
    query = query.eq('severity', filters.severity);
  }
  if (filters.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(`message.ilike.${pattern},url.ilike.${pattern}`);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[errors] list failed:', error.message);
    return { rows: [], error: 'Foutmeldingen konden niet worden geladen.' };
  }

  let rows = (data ?? []) as unknown as ErrorReportRow[];
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((row) => {
      const hay = [row.message, row.url, row.users?.email, row.users?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  return { rows, error: null };
}

export async function getErrorReportById(
  id: string,
): Promise<{ row: ErrorReportRow | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('error_reports')
    .select(
      `
      id, source, severity, status, message, stack, url, user_id,
      assignee_admin_id, context, resolved_at, resolved_by, created_at, updated_at,
      users:user_id ( id, email, name )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[errors] get failed:', error.message);
    return { row: null, error: 'Foutmelding kon niet worden geladen.' };
  }
  return { row: (data as unknown as ErrorReportRow) ?? null, error: null };
}

export async function listAdminAssignees(): Promise<
  { id: string; label: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('admin_profiles')
    .select('user_id, display_name, role, is_active')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  return (data ?? []).map((row) => ({
    id: String((row as { user_id: string }).user_id),
    label: `${(row as { display_name?: string | null }).display_name || (row as { user_id: string }).user_id.slice(0, 8)} (${(row as { role: string }).role})`,
  }));
}
