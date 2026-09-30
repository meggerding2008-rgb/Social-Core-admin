import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canImpersonate,
  canManageUsers,
  canViewSettings,
} from '@/lib/auth/permissions';
import { getUserProfile } from '@/lib/users/queries';
import { UserAdminActions } from '@/components/users/UserAdminActions';
import { ImpersonationButton } from '@/components/users/ImpersonationButton';
import { UserProfileSettingsPanel } from '@/components/users/UserProfileSettingsPanel';

export const dynamic = 'force-dynamic';

export default async function UserProfileSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewSettings(admin.profile.role)) throw new ForbiddenAdminError();

  const { row: user, error } = await getUserProfile(params.id);
  if (error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!user) notFound();

  const canMutate = canManageUsers(admin.profile.role);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">
          Profielinstellingen
        </h2>
        <p className="text-sm text-brand-accent">
          Profiel, onboarding en accountacties voor {user.email ?? user.id}.
        </p>
      </div>

      <UserProfileSettingsPanel user={user} canMutate={canMutate} />
      <ImpersonationButton
        userId={user.id}
        canImpersonate={canImpersonate(admin.profile.role)}
      />
      <UserAdminActions user={user} canMutate={canMutate} />
    </div>
  );
}
