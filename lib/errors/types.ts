import type { AdminRole } from '@/lib/auth/types';

/** DB values from phase 0 — UI shows Dutch labels. */
export const ERROR_STATUSES = ['open', 'triaged', 'resolved', 'ignored'] as const;
export type ErrorStatus = (typeof ERROR_STATUSES)[number];

export const ERROR_SEVERITIES = [
  'debug',
  'info',
  'warning',
  'error',
  'critical',
] as const;
export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

export const ERROR_SOURCES = [
  'admin',
  'user_app',
  'api',
  'cron',
  'other',
] as const;

export type ErrorReportRow = {
  id: string;
  source: string;
  severity: ErrorSeverity;
  status: ErrorStatus;
  message: string;
  stack: string | null;
  url: string | null;
  user_id: string | null;
  assignee_admin_id: string | null;
  context: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  users?: { id: string; email: string | null; name: string | null } | null;
};

export function canReadErrors(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'support' ||
    role === 'content' ||
    role === 'viewer'
  );
}

export function canMutateErrors(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'support';
}

export function canViewStack(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'support';
}

export function errorStatusLabel(status: ErrorStatus): string {
  switch (status) {
    case 'open':
      return 'Nieuw';
    case 'triaged':
      return 'Onderzocht';
    case 'resolved':
      return 'Opgelost';
    case 'ignored':
      return 'Genegeerd';
  }
}

export function errorSeverityLabel(severity: ErrorSeverity): string {
  return severity;
}

export function isErrorStatus(v: unknown): v is ErrorStatus {
  return typeof v === 'string' && (ERROR_STATUSES as readonly string[]).includes(v);
}

export function isErrorSeverity(v: unknown): v is ErrorSeverity {
  return typeof v === 'string' && (ERROR_SEVERITIES as readonly string[]).includes(v);
}

/** Strip likely secrets from free text before display. */
export function scrubSensitive(text: string | null): string | null {
  if (!text) return null;
  return text
    .replace(/(api[_-]?key|token|password|secret|authorization)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt-redacted]');
}
