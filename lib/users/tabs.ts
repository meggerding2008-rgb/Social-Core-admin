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
  /** Implementation phase marker (all tabs live) */
  phase: number;
};

export const USER_DETAIL_TABS: UserDetailTab[] = [
  {
    id: 'overview',
    label: 'Overzicht',
    href: (id) => `/users/${id}`,
    canView: canViewUsers,
    phase: 1,
  },
  {
    id: 'posts',
    label: 'Posts',
    href: (id) => `/users/${id}/posts`,
    canView: canViewPosts,
    phase: 2,
  },
  {
    id: 'calendar',
    label: 'Kalender',
    href: (id) => `/users/${id}/calendar`,
    canView: canViewPosts,
    phase: 2,
  },
  {
    id: 'statistics',
    label: 'Statistieken',
    href: (id) => `/users/${id}/statistics`,
    canView: canViewStatistics,
    phase: 3,
  },
  {
    id: 'trends',
    label: 'Trends',
    href: (id) => `/users/${id}/trends`,
    canView: canViewTrends,
    phase: 3,
  },
  {
    id: 'competitors',
    label: 'Concurrenten',
    href: (id) => `/users/${id}/competitors`,
    canView: canViewCompetitors,
    phase: 3,
  },
  {
    id: 'billing',
    label: 'Betalingen',
    href: (id) => `/users/${id}/billing`,
    canView: canViewBilling,
    phase: 4,
  },
  {
    id: 'usage',
    label: 'Verbruik',
    href: (id) => `/users/${id}/usage`,
    canView: canViewUsage,
    phase: 4,
  },
  {
    id: 'library',
    label: 'Bibliotheek',
    href: (id) => `/users/${id}/library`,
    canView: canViewLibrary,
    phase: 5,
  },
  {
    id: 'system-settings',
    label: 'Systeeminstellingen',
    href: (id) => `/users/${id}/system-settings`,
    canView: canViewSettings,
    phase: 5,
  },
  {
    id: 'profile-settings',
    label: 'Profielinstellingen',
    href: (id) => `/users/${id}/profile-settings`,
    canView: canViewSettings,
    phase: 5,
  },
  {
    id: 'team',
    label: 'Team',
    href: (id) => `/users/${id}/team`,
    canView: canViewTeams,
    phase: 5,
  },
  {
    id: 'support',
    label: 'Support',
    href: (id) => `/users/${id}/support`,
    canView: canViewSupport,
    phase: 6,
  },
  {
    id: 'reviews',
    label: 'Contentreviews',
    href: (id) => `/users/${id}/reviews`,
    canView: canViewReviews,
    phase: 6,
  },
  {
    id: 'activity',
    label: 'Activiteit en audit',
    href: (id) => `/users/${id}/activity`,
    canView: canViewAudit,
    phase: 7,
  },
];

export function tabsForRole(role: AdminRole): UserDetailTab[] {
  return USER_DETAIL_TABS.filter((tab) => tab.canView(role));
}
