import { createClient } from '@/lib/supabase/server';
import {
  isWebsiteMessageStatus,
  type WebsiteMessageReplyRow,
  type WebsiteMessageRow,
  type WebsiteMessageStatus,
} from '@/lib/web-support/types';

export type WebSupportListFilters = {
  status?: string;
  q?: string;
};

function mapRow(raw: Record<string, unknown>): WebsiteMessageRow | null {
  if (typeof raw.id !== 'string') return null;
  if (!isWebsiteMessageStatus(raw.status)) return null;
  if (typeof raw.sender_name !== 'string') return null;
  if (typeof raw.sender_email !== 'string') return null;
  if (typeof raw.message !== 'string') return null;

  let users: WebsiteMessageRow['users'] = null;
  if (raw.users && typeof raw.users === 'object') {
    const u = raw.users as Record<string, unknown>;
    users = {
      id: String(u.id ?? ''),
      email: typeof u.email === 'string' ? u.email : null,
      name: typeof u.name === 'string' ? u.name : null,
      company: typeof u.company === 'string' ? u.company : null,
    };
  }

  return {
    id: raw.id,
    sender_name: raw.sender_name,
    sender_email: raw.sender_email,
    subject: typeof raw.subject === 'string' ? raw.subject : null,
    message: raw.message,
    status: raw.status as WebsiteMessageStatus,
    source: typeof raw.source === 'string' ? raw.source : 'base44_website',
    user_id: typeof raw.user_id === 'string' ? raw.user_id : null,
    support_ticket_id:
      typeof raw.support_ticket_id === 'string' ? raw.support_ticket_id : null,
    assigned_to: typeof raw.assigned_to === 'string' ? raw.assigned_to : null,
    replied_at: typeof raw.replied_at === 'string' ? raw.replied_at : null,
    external_id: typeof raw.external_id === 'string' ? raw.external_id : null,
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
    users,
  };
}

const SELECT_FIELDS = `
  id,
  sender_name,
  sender_email,
  subject,
  message,
  status,
  source,
  user_id,
  support_ticket_id,
  assigned_to,
  replied_at,
  external_id,
  created_at,
  updated_at,
  users:user_id (
    id,
    email,
    name,
    company
  )
`;

export async function listWebsiteMessages(
  filters: WebSupportListFilters,
): Promise<{ rows: WebsiteMessageRow[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase
    .from('website_messages')
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const q = filters.q?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) {
      const pattern = `%${safe}%`;
      query = query.or(
        `sender_name.ilike.${pattern},sender_email.ilike.${pattern},subject.ilike.${pattern},message.ilike.${pattern}`,
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('[web-support] list failed:', error.message);
    if (
      error.message.includes('website_messages') ||
      error.message.includes('schema cache')
    ) {
      return {
        rows: [],
        error:
          'Tabel website_messages ontbreekt. Voer supabase/migrations/20260927_website_messages.sql uit in Supabase.',
      };
    }
    return { rows: [], error: 'Websiteberichten konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapRow(item as Record<string, unknown>))
    .filter((row): row is WebsiteMessageRow => row !== null);

  return { rows, error: null };
}

export async function getWebsiteMessageById(
  id: string,
): Promise<{ row: WebsiteMessageRow | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('website_messages')
    .select(SELECT_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[web-support] get failed:', error.message);
    return { row: null, error: 'Websitebericht kon niet worden geladen.' };
  }

  if (!data) return { row: null, error: null };

  return {
    row: mapRow(data as Record<string, unknown>),
    error: null,
  };
}

export async function countOpenWebsiteMessages(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('website_messages')
    .select('id', { count: 'exact', head: true })
    .in('status', ['nieuw', 'in_behandeling']);

  if (error) {
    console.error('[web-support] count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function countNewWebsiteMessages(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('website_messages')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'nieuw');

  if (error) {
    console.error('[web-support] new count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

export async function listWebsiteMessageReplies(
  websiteMessageId: string,
): Promise<{ rows: WebsiteMessageReplyRow[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('website_message_replies')
    .select(
      'id, website_message_id, admin_id, message, recipient_email, sent_at, delivery_status, created_at',
    )
    .eq('website_message_id', websiteMessageId)
    .order('sent_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[web-support] replies list failed:', error.message);
    if (
      error.message.includes('website_message_replies') ||
      error.message.includes('schema cache')
    ) {
      return {
        rows: [],
        error:
          'Tabel website_message_replies ontbreekt. Voer supabase/migrations/20260927_website_message_replies.sql uit.',
      };
    }
    return { rows: [], error: 'Antwoordgeschiedenis kon niet worden geladen.' };
  }

  return {
    rows: (data ?? []) as WebsiteMessageReplyRow[],
    error: null,
  };
}
