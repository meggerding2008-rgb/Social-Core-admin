import { createClient } from '@/lib/supabase/server';
import {
  isPopupAudience,
  isPopupDisplayStyle,
  isPopupPersistUntil,
  isPopupStatus,
  isPopupType,
  type AdminPopupRow,
  type PopupAudienceFilter,
  type PopupResponseRow,
} from '@/lib/popups/types';

export type PopupListFilters = {
  status?: string;
  type?: string;
  q?: string;
};

function mapFilter(raw: unknown): PopupAudienceFilter {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const row = raw as Record<string, unknown>;
  return {
    tier: typeof row.tier === 'string' ? row.tier : undefined,
    feature: typeof row.feature === 'string' ? row.feature : undefined,
  };
}

function mapPopup(raw: Record<string, unknown>): AdminPopupRow | null {
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  if (typeof raw.body !== 'string') return null;
  if (!isPopupType(raw.type) || !isPopupAudience(raw.audience)) return null;
  if (!isPopupStatus(raw.status) || !isPopupDisplayStyle(raw.display_style)) {
    return null;
  }
  const persist = isPopupPersistUntil(raw.persist_until)
    ? raw.persist_until
    : 'until_dismiss_or_respond';

  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    type: raw.type,
    audience: raw.audience,
    audience_filter: mapFilter(raw.audience_filter),
    status: raw.status,
    display_style: raw.display_style,
    start_at: typeof raw.start_at === 'string' ? raw.start_at : null,
    end_at: typeof raw.end_at === 'string' ? raw.end_at : null,
    show_after_days:
      typeof raw.show_after_days === 'number' ? raw.show_after_days : null,
    show_once: raw.show_once !== false,
    persist_until: persist,
    created_by: typeof raw.created_by === 'string' ? raw.created_by : null,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? raw.created_at ?? ''),
  };
}

const SELECT = `
  id, title, body, type, audience, audience_filter, status, display_style,
  start_at, end_at, show_after_days, show_once, persist_until,
  created_by, created_at, updated_at
`;

export async function listPopups(
  filters: PopupListFilters,
): Promise<{ rows: AdminPopupRow[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from('admin_popups')
    .select(SELECT)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all' && isPopupStatus(filters.status)) {
    query = query.eq('status', filters.status);
  }
  if (filters.type && filters.type !== 'all' && isPopupType(filters.type)) {
    query = query.eq('type', filters.type);
  }
  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      query = query.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('[popups] list failed:', error.message);
    if (error.message.includes('admin_popups') || error.message.includes('schema')) {
      return {
        rows: [],
        error:
          'Pop-uptabel ontbreekt. Voer supabase/migrations/20260927_admin_popups.sql uit in Supabase.',
      };
    }
    return { rows: [], error: 'Pop-ups konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapPopup(item as Record<string, unknown>))
    .filter((row): row is AdminPopupRow => row !== null);

  return { rows, error: null };
}

export async function getPopupById(
  id: string,
): Promise<{
  row: AdminPopupRow | null;
  responses: PopupResponseRow[];
  dismissalCount: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('admin_popups')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[popups] get failed:', error.message);
    return {
      row: null,
      responses: [],
      dismissalCount: 0,
      error: 'Pop-up kon niet worden geladen.',
    };
  }
  if (!data) {
    return { row: null, responses: [], dismissalCount: 0, error: null };
  }

  const row = mapPopup(data as Record<string, unknown>);
  if (!row) {
    return {
      row: null,
      responses: [],
      dismissalCount: 0,
      error: 'Pop-upgegevens ongeldig.',
    };
  }

  const [{ data: responses }, { count: dismissalCount }] = await Promise.all([
    supabase
      .from('admin_popup_responses')
      .select(
        `
        id, popup_id, user_id, response, responded_at,
        users:user_id ( id, email, name )
      `,
      )
      .eq('popup_id', id)
      .order('responded_at', { ascending: false })
      .limit(100),
    supabase
      .from('admin_popup_dismissals')
      .select('id', { count: 'exact', head: true })
      .eq('popup_id', id),
  ]);

  const mappedResponses: PopupResponseRow[] = (responses ?? []).map((r) => {
    const raw = r as Record<string, unknown>;
    let users: PopupResponseRow['users'] = null;
    const u = raw.users;
    if (u && typeof u === 'object' && !Array.isArray(u)) {
      const ur = u as Record<string, unknown>;
      users = {
        id: String(ur.id ?? ''),
        email: typeof ur.email === 'string' ? ur.email : null,
        name: typeof ur.name === 'string' ? ur.name : null,
      };
    }
    return {
      id: String(raw.id),
      popup_id: String(raw.popup_id),
      user_id: String(raw.user_id),
      response:
        raw.response && typeof raw.response === 'object'
          ? (raw.response as Record<string, unknown>)
          : {},
      responded_at: String(raw.responded_at ?? ''),
      users,
    };
  });

  return {
    row: {
      ...row,
      response_count: mappedResponses.length,
      dismissal_count: dismissalCount ?? 0,
    },
    responses: mappedResponses,
    dismissalCount: dismissalCount ?? 0,
    error: null,
  };
}

export async function getPopupDashboardCounts(): Promise<{
  open: number;
  active: number;
  planned: number;
  noEndDate: number;
  feedbackResponses: number;
}> {
  const supabase = await createClient();

  const [open, active, planned, noEndDate, feedbackResponses] =
    await Promise.all([
      count(
        supabase
          .from('admin_popups')
          .select('id', { count: 'exact', head: true })
          .in('status', ['actief', 'gepland']),
      ),
      count(
        supabase
          .from('admin_popups')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'actief'),
      ),
      count(
        supabase
          .from('admin_popups')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'gepland'),
      ),
      count(
        supabase
          .from('admin_popups')
          .select('id', { count: 'exact', head: true })
          .in('status', ['actief', 'gepland'])
          .is('end_at', null),
      ),
      count(
        supabase
          .from('admin_popup_responses')
          .select('id', { count: 'exact', head: true }),
      ),
    ]);

  return { open, active, planned, noEndDate, feedbackResponses };
}

async function count(
  promise: PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
): Promise<number> {
  const { count, error } = await promise;
  if (error) {
    console.error('[popups] count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}
