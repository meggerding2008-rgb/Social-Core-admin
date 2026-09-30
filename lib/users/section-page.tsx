import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import type { AdminRole } from '@/lib/auth/types';
import { getUserProfile } from '@/lib/users/queries';
import { USER_DETAIL_TABS, type UserDetailTabId } from '@/lib/users/tabs';
import { UserSectionPlaceholder } from '@/components/users/UserSectionPlaceholder';

export async function renderUserSectionPlaceholder(input: {
  userId: string;
  tabId: UserDetailTabId;
  canView: (role: AdminRole) => boolean;
}) {
  const admin = await requireAdmin();
  if (!input.canView(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { row: user } = await getUserProfile(input.userId);
  if (!user) notFound();

  const tab = USER_DETAIL_TABS.find((t) => t.id === input.tabId);
  if (!tab) notFound();

  return (
    <UserSectionPlaceholder
      userId={user.id}
      title={tab.label}
      phase={0}
    />
  );
}
