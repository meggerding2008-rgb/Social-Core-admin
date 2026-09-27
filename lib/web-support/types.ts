export const WEBSITE_MESSAGE_STATUSES = [
  'nieuw',
  'in_behandeling',
  'beantwoord',
  'gesloten',
] as const;

export type WebsiteMessageStatus = (typeof WEBSITE_MESSAGE_STATUSES)[number];

export type WebsiteMessageRow = {
  id: string;
  sender_name: string;
  sender_email: string;
  subject: string | null;
  message: string;
  status: WebsiteMessageStatus;
  source: string;
  user_id: string | null;
  support_ticket_id: string | null;
  assigned_to: string | null;
  replied_at: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    email: string | null;
    name: string | null;
    company: string | null;
  } | null;
};

export function isWebsiteMessageStatus(
  value: unknown,
): value is WebsiteMessageStatus {
  return (
    typeof value === 'string' &&
    (WEBSITE_MESSAGE_STATUSES as readonly string[]).includes(value)
  );
}

export function websiteMessageStatusLabel(status: WebsiteMessageStatus): string {
  switch (status) {
    case 'nieuw':
      return 'Nieuw';
    case 'in_behandeling':
      return 'In behandeling';
    case 'beantwoord':
      return 'Beantwoord';
    case 'gesloten':
      return 'Gesloten';
    default:
      return status;
  }
}
