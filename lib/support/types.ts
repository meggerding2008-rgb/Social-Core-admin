import type { AdminRole } from '@/lib/auth/types';

export const SUPPORT_MESSAGE_STATUSES = [
  'open',
  'in_behandeling',
  'beantwoord',
  'opgelost',
  'gesloten',
] as const;

export type SupportMessageStatus = (typeof SUPPORT_MESSAGE_STATUSES)[number];

/** Statuses admins can set in the UI (gesloten remains readable for legacy). */
export const SUPPORT_ADMIN_SETTABLE_STATUSES = [
  'open',
  'in_behandeling',
  'beantwoord',
  'opgelost',
] as const;

export type SupportAdminSettableStatus =
  (typeof SUPPORT_ADMIN_SETTABLE_STATUSES)[number];

export const SUPPORT_CATEGORIES = [
  'Algemeen',
  'Account & toegang',
  'Betalingen',
  'Technisch probleem',
  'Platformkoppeling',
  'Anders',
] as const;

export type SupportUserSummary = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
};

export type SupportMessageRow = {
  id: string;
  user_id: string;
  message: string;
  subject: string | null;
  category: string | null;
  priority: boolean;
  status: SupportMessageStatus;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  users: SupportUserSummary | null;
};

export type SupportConversationRow = {
  id: string;
  user_id: string;
  type: 'ai' | 'human';
  status: 'open' | 'closed';
  title: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
};

export type SupportConversationMessageRow = {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'core' | 'human';
  content: string;
  created_at: string;
};

export function canReadSupport(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'support' ||
    role === 'content' ||
    role === 'viewer'
  );
}

export function canMutateSupport(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'support';
}

export function isSupportMessageStatus(
  value: unknown,
): value is SupportMessageStatus {
  return (
    typeof value === 'string' &&
    (SUPPORT_MESSAGE_STATUSES as readonly string[]).includes(value)
  );
}

export function isSupportAdminSettableStatus(
  value: unknown,
): value is SupportAdminSettableStatus {
  return (
    typeof value === 'string' &&
    (SUPPORT_ADMIN_SETTABLE_STATUSES as readonly string[]).includes(value)
  );
}
