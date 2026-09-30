import type { AdminRole } from '@/lib/auth/types';
import {
  canViewBilling,
  canViewCompetitors,
  canViewLibrary,
  canViewPosts,
  canViewReviews,
  canViewSettings,
  canViewStatistics,
  canViewSupport,
  canViewTeams,
  canViewTrends,
  canViewUsage,
  canViewUsers,
  canViewAudit,
} from '@/lib/auth/permissions';

export type UserDetailTabId =
  | 'overview'
  | 'posts'
  | 'calendar'
  | 'statistics'
  | 'trends'
  | 'competitors'
  | 'billing'
  | 'usage'
  | 'library'
  | 'system-settings'
  | 'profile-settings'
  | 'team'
  | 'support'
  | 'reviews'
  | 'activity';

export type UserDetailTab = {
  id: UserDetailTabId;
  label: string;
  href: (userId: string) => string;
  canView: (role: AdminRole) => boolean;
};

/** Safe props for Client Components (no functions). */
export type UserDetailNavTab = {
  id: UserDetailTabId;
  label: string;
  href: string;
};

export const USER_DETAIL_TABS: UserDetailTab[] = [
  {
    id: 'overview',
    label: 'Overzicht',
    href: (id) => `/users/${id}`,
    canView: canViewUsers,
  },
  {
    id: 'posts',
    label: 'Posts',
    href: (id) => `/users/${id}/posts`,
    canView: canViewPosts,
  },
  {
    id: 'calendar',
    label: 'Kalender',
    href: (id) => `/users/${id}/calendar`,
    canView: canViewPosts,
  },
  {
    id: 'statistics',
    label: 'Statistieken',
    href: (id) => `/users/${id}/statistics`,
    canView: canViewStatistics,
  },
  {
    id: 'trends',
    label: 'Trends',
    href: (id) => `/users/${id}/trends`,
    canView: canViewTrends,
  },
  {
    id: 'competitors',
    label: 'Concurrenten',
    href: (id) => `/users/${id}/competitors`,
    canView: canViewCompetitors,
  },
  {
    id: 'billing',
    label: 'Betalingen',
    href: (id) => `/users/${id}/billing`,
    canView: canViewBilling,
  },
  {
    id: 'usage',
    label: 'Verbruik',
    href: (id) => `/users/${id}/usage`,
    canView: canViewUsage,
  },
  {
    id: 'library',
    label: 'Bibliotheek',
    href: (id) => `/users/${id}/library`,
    canView: canViewLibrary,
  },
  {
    id: 'system-settings',
    label: 'Systeeminstellingen',
    href: (id) => `/users/${id}/system-settings`,
    canView: canViewSettings,
  },
  {
    id: 'profile-settings',
    label: 'Profielinstellingen',
    href: (id) => `/users/${id}/profile-settings`,
    canView: canViewSettings,
  },
  {
    id: 'team',
    label: 'Team',
    href: (id) => `/users/${id}/team`,
    canView: canViewTeams,
  },
  {
    id: 'support',
    label: 'Support',
    href: (id) => `/users/${id}/support`,
    canView: canViewSupport,
  },
  {
    id: 'reviews',
    label: 'Reviews',
    href: (id) => `/users/${id}/reviews`,
    canView: canViewReviews,
  },
  {
    id: 'activity',
    label: 'Audit',
    href: (id) => `/users/${id}/activity`,
    canView: canViewAudit,
  },
];

export function tabsForRole(role: AdminRole): UserDetailTab[] {
  return USER_DETAIL_TABS.filter((tab) => tab.canView(role));
}

export function navTabsForUser(
  role: AdminRole,
  userId: string,
): UserDetailNavTab[] {
  return tabsForRole(role).map((tab) => ({
    id: tab.id,
    label: tab.label,
    href: tab.href(userId),
  }));
}
