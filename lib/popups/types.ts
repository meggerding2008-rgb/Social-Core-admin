import type { AdminRole } from '@/lib/auth/types';

export const POPUP_TYPES = [
  'feedback',
  'product_update',
  'maintenance',
  'announcement',
  'survey',
] as const;
export type PopupType = (typeof POPUP_TYPES)[number];

export const POPUP_AUDIENCES = [
  'all',
  'new_users',
  'subscription',
  'feature',
] as const;
export type PopupAudience = (typeof POPUP_AUDIENCES)[number];

export const POPUP_STATUSES = [
  'concept',
  'gepland',
  'actief',
  'gepauzeerd',
  'verlopen',
  'gearchiveerd',
] as const;
export type PopupStatus = (typeof POPUP_STATUSES)[number];

export const POPUP_DISPLAY_STYLES = [
  'informatief',
  'feedbackvraag',
  'enquete',
  'onderhoudsmelding',
  'update',
] as const;
export type PopupDisplayStyle = (typeof POPUP_DISPLAY_STYLES)[number];

export const POPUP_PERSIST_UNTIL = [
  'once',
  'until_dismiss',
  'until_respond',
  'until_dismiss_or_respond',
] as const;
export type PopupPersistUntil = (typeof POPUP_PERSIST_UNTIL)[number];

export type PopupAudienceFilter = {
  tier?: string;
  feature?: string;
};

export type AdminPopupRow = {
  id: string;
  title: string;
  body: string;
  type: PopupType;
  audience: PopupAudience;
  audience_filter: PopupAudienceFilter;
  status: PopupStatus;
  display_style: PopupDisplayStyle;
  start_at: string | null;
  end_at: string | null;
  show_after_days: number | null;
  show_once: boolean;
  persist_until: PopupPersistUntil;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  response_count?: number;
  dismissal_count?: number;
};

export type PopupResponseRow = {
  id: string;
  popup_id: string;
  user_id: string;
  response: Record<string, unknown>;
  responded_at: string;
  users?: { id: string; email: string | null; name: string | null } | null;
};

export function canReadPopups(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'content' ||
    role === 'support' ||
    role === 'viewer'
  );
}

export function canMutatePopups(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

export function isPopupStatus(v: unknown): v is PopupStatus {
  return typeof v === 'string' && (POPUP_STATUSES as readonly string[]).includes(v);
}

export function isPopupType(v: unknown): v is PopupType {
  return typeof v === 'string' && (POPUP_TYPES as readonly string[]).includes(v);
}

export function isPopupAudience(v: unknown): v is PopupAudience {
  return typeof v === 'string' && (POPUP_AUDIENCES as readonly string[]).includes(v);
}

export function isPopupDisplayStyle(v: unknown): v is PopupDisplayStyle {
  return (
    typeof v === 'string' &&
    (POPUP_DISPLAY_STYLES as readonly string[]).includes(v)
  );
}

export function isPopupPersistUntil(v: unknown): v is PopupPersistUntil {
  return (
    typeof v === 'string' &&
    (POPUP_PERSIST_UNTIL as readonly string[]).includes(v)
  );
}

export function popupTypeLabel(type: PopupType): string {
  switch (type) {
    case 'feedback':
      return 'Feedback';
    case 'product_update':
      return 'Productupdate';
    case 'maintenance':
      return 'Onderhoud';
    case 'announcement':
      return 'Aankondiging';
    case 'survey':
      return 'Enquête';
  }
}

export function popupAudienceLabel(audience: PopupAudience): string {
  switch (audience) {
    case 'all':
      return 'Alle gebruikers';
    case 'new_users':
      return 'Nieuwe gebruikers';
    case 'subscription':
      return 'Abonnement';
    case 'feature':
      return 'Functiegebruikers';
  }
}

export function popupStatusLabel(status: PopupStatus): string {
  switch (status) {
    case 'concept':
      return 'Concept';
    case 'gepland':
      return 'Gepland';
    case 'actief':
      return 'Actief';
    case 'gepauzeerd':
      return 'Gepauzeerd';
    case 'verlopen':
      return 'Verlopen';
    case 'gearchiveerd':
      return 'Gearchiveerd';
  }
}

export function popupDisplayStyleLabel(style: PopupDisplayStyle): string {
  switch (style) {
    case 'informatief':
      return 'Informatief';
    case 'feedbackvraag':
      return 'Feedbackvraag';
    case 'enquete':
      return 'Enquête';
    case 'onderhoudsmelding':
      return 'Onderhoudsmelding';
    case 'update':
      return 'Update';
  }
}

export function popupPersistLabel(value: PopupPersistUntil): string {
  switch (value) {
    case 'once':
      return 'Toon één keer';
    case 'until_dismiss':
      return 'Tot “Niet nu”';
    case 'until_respond':
      return 'Tot reactie';
    case 'until_dismiss_or_respond':
      return 'Tot afwijzing of reactie';
  }
}
