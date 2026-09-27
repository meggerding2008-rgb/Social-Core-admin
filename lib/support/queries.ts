import { createClient } from '@/lib/supabase/server';
import {
  isSupportMessageStatus,
  type SupportConversationMessageRow,
  type SupportConversationRow,
  type SupportMessageRow,
  type SupportMessageStatus,
  type SupportUserSummary,
} from '@/lib/support/types';

export type SupportListFilters = {
  status?: string;
  priority?: string;
  category?: string;
  q?: string;
};

function mapUser(raw: unknown): SupportUserSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    id: String(row.id ?? ''),
    email: typeof row.email === 'string' ? row.email : null,
    name: typeof row.name === 'string' ? row.name : null,
    company: typeof row.company === 'string' ? row.company : null,
  };
}

function mapMessage(raw: Record<string, unknown>): SupportMessageRow | null {
  if (typeof raw.id !== 'string' || typeof raw.user_id !== 'string') return null;
  if (!isSupportMessageStatus(raw.status)) return null;

  return {
    id: raw.id,
    user_id: raw.user_id,
    message: typeof raw.message === 'string' ? raw.message : '',
    subject: typeof raw.subject === 'string' ? raw.subject : null,
    category: typeof raw.category === 'string' ? raw.category : null,
    priority: Boolean(raw.priority),
    status: raw.status,
    admin_reply: typeof raw.admin_reply === 'string' ? raw.admin_reply : null,
    source:
      raw.source === 'admin_initiated'
        ? 'admin_initiated'
        : raw.source === 'website_converted'
          ? 'website_converted'
          : 'user',
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
    users: mapUser(raw.users),
  };
}

export async function listSupportMessages(
  filters: SupportListFilters,
): Promise<{ rows: SupportMessageRow[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('support_messages')
    .select(
      `
      id,
      user_id,
      message,
      subject,
      category,
      priority,
      status,
      admin_reply,
      source,
      created_at,
      updated_at,
      users:user_id (
        id,
        email,
        name,
        company
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.priority === 'high') {
    query = query.eq('priority', true);
  } else if (filters.priority === 'normal') {
    query = query.eq('priority', false);
  }

  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `subject.ilike.${pattern},message.ilike.${pattern},category.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[support] list failed:', error.message);
    if (error.message.includes('source')) {
      // Pre-migration: load without source
      const fallback = await supabase
        .from('support_messages')
        .select(
          `
          id, user_id, message, subject, category, priority, status,
          admin_reply, created_at, updated_at,
          users:user_id ( id, email, name, company )
        `,
        )
        .order('created_at', { ascending: false })
        .limit(200);
      if (fallback.error) {
        return {
          rows: [],
          error:
            'Kolom source ontbreekt. Voer supabase/migrations/20260927_support_admin_outreach.sql uit in Supabase.',
        };
      }
      let rows = (fallback.data ?? [])
        .map((item) =>
          mapMessage({ ...(item as Record<string, unknown>), source: 'user' }),
        )
        .filter((row): row is SupportMessageRow => row !== null);
      if (filters.status && filters.status !== 'all') {
        rows = rows.filter((r) => r.status === filters.status);
      }
      return { rows, error: null };
    }
    return {
      rows: [],
      error: 'Supportvragen konden niet worden geladen.',
    };
  }

  let rows = (data ?? [])
    .map((item) => mapMessage(item as Record<string, unknown>))
    .filter((row): row is SupportMessageRow => row !== null);

  // Extra search on user email/name (PostgREST or-filter can't easily join).
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((row) => {
      const hay = [
        row.subject,
        row.message,
        row.category,
        row.users?.email,
        row.users?.name,
        row.users?.company,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  return { rows, error: null };
}

export async function getSupportMessageById(
  id: string,
): Promise<{ row: SupportMessageRow | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('support_messages')
    .select(
      `
      id,
      user_id,
      message,
      subject,
      category,
      priority,
      status,
      admin_reply,
      source,
      created_at,
      updated_at,
      users:user_id (
        id,
        email,
        name,
        company
      )
    `,
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[support] get failed:', error.message);
    if (error.message.includes('source')) {
      // Backward-compatible fallback before migration
      const fallback = await supabase
        .from('support_messages')
        .select(
          `
          id, user_id, message, subject, category, priority, status,
          admin_reply, created_at, updated_at,
          users:user_id ( id, email, name, company )
        `,
        )
        .eq('id', id)
        .maybeSingle();
      if (fallback.error || !fallback.data) {
        return { row: null, error: 'Supportvraag kon niet worden geladen.' };
      }
      const mapped = mapMessage({
        ...(fallback.data as Record<string, unknown>),
        source: 'user',
      });
      return { row: mapped, error: null };
    }
    return { row: null, error: 'Supportvraag kon niet worden geladen.' };
  }

  if (!data) {
    return { row: null, error: null };
  }

  return {
    row: mapMessage(data as Record<string, unknown>),
    error: null,
  };
}

export async function listHumanConversationsForUser(
  userId: string,
): Promise<{ rows: SupportConversationRow[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('support_conversations')
    .select(
      'id, user_id, type, status, title, created_at, updated_at, last_message_at',
    )
    .eq('user_id', userId)
    .eq('type', 'human')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    // last_message_at may be missing on older DBs — retry without it.
    if (error.message.includes('last_message_at')) {
      const fallback = await supabase
        .from('support_conversations')
        .select('id, user_id, type, status, title, created_at, updated_at')
        .eq('user_id', userId)
        .eq('type', 'human')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (fallback.error) {
        console.error('[support] conversations failed:', fallback.error.message);
        return {
          rows: [],
          error: 'Gesprekken konden niet worden geladen.',
        };
      }

      const rows = (fallback.data ?? []).map((row) => ({
        ...(row as Omit<SupportConversationRow, 'last_message_at'>),
        last_message_at: null,
      }));
      return { rows, error: null };
    }

    console.error('[support] conversations failed:', error.message);
    return { rows: [], error: 'Gesprekken konden niet worden geladen.' };
  }

  return {
    rows: (data ?? []) as SupportConversationRow[],
    error: null,
  };
}

export async function listConversationMessages(
  conversationId: string,
): Promise<{ rows: SupportConversationMessageRow[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('support_conversation_messages')
    .select('id, conversation_id, sender_type, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    console.error('[support] messages failed:', error.message);
    return { rows: [], error: 'Berichten konden niet worden geladen.' };
  }

  return {
    rows: (data ?? []) as SupportConversationMessageRow[],
    error: null,
  };
}

export async function listUsersForSupportSelect(): Promise<
  { id: string; label: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, company')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[support] users select failed:', error.message);
    return [];
  }

  return (data ?? []).map((u) => {
    const row = u as {
      id: string;
      name?: string | null;
      email?: string | null;
      company?: string | null;
    };
    const label = [row.name, row.email, row.company].filter(Boolean).join(' · ');
    return { id: row.id, label: label || row.id };
  });
}

