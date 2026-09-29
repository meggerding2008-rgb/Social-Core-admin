import type { AdminRole } from '@/lib/auth/types';

/**
 * Server-side domain permissions for the admin panel.
 * Never rely on UI alone — always call these in Server Actions / pages.
 */

export function canManageUsers(role: AdminRole): boolean {
  return role === 'superadmin';
}

/** Read user profiles / account overview */
export function canViewUsers(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'support' ||
    role === 'content' ||
    role === 'viewer'
  );
}

export function canManagePosts(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

export function canViewPosts(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'content' ||
    role === 'support' ||
    role === 'viewer'
  );
}

export function canViewStatistics(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'support' ||
    role === 'content' ||
    role === 'viewer'
  );
}

export function canManageTrends(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

export function canViewTrends(role: AdminRole): boolean {
  return canViewStatistics(role);
}

export function canManageCompetitors(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

export function canViewCompetitors(role: AdminRole): boolean {
  return canViewStatistics(role);
}

/** Stripe / package changes — superadmin only */
export function canManageBilling(role: AdminRole): boolean {
  return role === 'superadmin';
}

export function canViewBilling(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'support' || role === 'viewer';
}

export function canViewUsage(role: AdminRole): boolean {
  return canViewBilling(role) || role === 'content';
}

export function canManageLibrary(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

export function canViewLibrary(role: AdminRole): boolean {
  return canViewPosts(role);
}

export function canManageSettings(role: AdminRole): boolean {
  return role === 'superadmin';
}

export function canViewSettings(role: AdminRole): boolean {
  return canViewUsers(role);
}

export function canManageTeams(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'support';
}

export function canViewTeams(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'support' ||
    role === 'viewer'
  );
}

export function canManageSupport(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'support';
}

export function canViewSupport(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'support' || role === 'viewer';
}

export function canManageContent(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content';
}

export function canManageReviews(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'content' || role === 'support';
}

export function canViewReviews(role: AdminRole): boolean {
  return canViewUsers(role);
}

export function canViewAudit(role: AdminRole): boolean {
  return role === 'superadmin' || role === 'viewer';
}

/** Impersonation — superadmin only; never for billing without extra confirm */
export function canImpersonate(role: AdminRole): boolean {
  return role === 'superadmin';
}
