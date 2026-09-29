import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canViewUsers } from '@/lib/auth/permissions';
import { getUserProfile } from '@/lib/users/queries';
import { tabsForRole } from '@/lib/users/tabs';
import { UserDetailHeader } from '@/components/users/UserDetailHeader';

export const dynamic = 'force-dynamic';

export default async function UserDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewUsers(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { row: user, error } = await getUserProfile(params.id);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
        <Link href="/users" className="text-sm font-medium text-brand-navy">
          ← Terug naar gebruikers
        </Link>
      </div>
    );
  }

  if (!user) notFound();

  const tabs = tabsForRole(admin.profile.role);

  return (
    <UserDetailHeader user={user} tabs={tabs}>
      {children}
    </UserDetailHeader>
  );
}
