import type { AdminRole } from '@/lib/auth/types';

export const ACCOUNT_STATUSES = ['active', 'blocked'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const PLAN_FILTERS = ['all', 'silver', 'gold', 'diamond'] as const;

export type UserListRow = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  subscription_tier: string | null;
  account_status: AccountStatus;
  created_at: string;
  subscription: {
    tier: string | null;
    status: string | null;
    current_period_end: string | null;
  } | null;
};

export type UserProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  subscription_tier: string | null;
  account_status: AccountStatus;
  created_at: string;
  phone: string | null;
  job_title: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  language: string | null;
  timezone: string | null;
  onboarding_completed: boolean;
  avatar_url: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageRow = {
  id: string;
  user_id: string;
  month: string;
  posts_used: number;
  posts_limit: number | null;
  ai_generations_used: number;
  ai_generations_limit: number | null;
  platforms_used: number;
  platforms_limit: number | null;
  team_members_used: number;
  team_members_limit: number | null;
};

export type RecentPostRow = {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string;
  scheduled_for: string | null;
  published_at: string | null;
};

export type RecentSupportRow = {
  id: string;
  subject: string | null;
  status: string;
  priority: boolean;
  created_at: string;
};

export function canReadUsers(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'support' ||
    role === 'content' ||
    role === 'viewer'
  );
}

/** Block / activate / profile edit / password reset — superadmin only. */
export function canMutateUsers(role: AdminRole): boolean {
  return role === 'superadmin';
}

export function isAccountStatus(value: unknown): value is AccountStatus {
  return value === 'active' || value === 'blocked';
}

export function normalizePlanSlug(value: string | null | undefined): string {
  const key = String(value ?? '')
    .trim()
    .toLowerCase();
  if (key === 'zilver' || key === 'silver') return 'silver';
  if (key === 'goud' || key === 'gold') return 'gold';
  if (key === 'diamant' || key === 'diamond') return 'diamond';
  return key || 'silver';
}

export function planLabel(value: string | null | undefined): string {
  const slug = normalizePlanSlug(value);
  if (slug === 'silver') return 'Zilver';
  if (slug === 'gold') return 'Goud';
  if (slug === 'diamond') return 'Diamant';
  return value?.trim() || '—';
}

export function subscriptionStatusLabel(status: string | null | undefined): string {
  switch (String(status ?? '').toLowerCase()) {
    case 'active':
      return 'Actief';
    case 'cancelled':
    case 'canceled':
      return 'Opgezegd';
    case 'paused':
      return 'Gepauzeerd';
    case '':
      return 'Geen abonnement';
    default:
      return String(status);
  }
}

export function accountStatusLabel(status: AccountStatus): string {
  return status === 'blocked' ? 'Geblokkeerd' : 'Actief';
}
