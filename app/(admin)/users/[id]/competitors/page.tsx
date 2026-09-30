import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canManageCompetitors,
  canViewCompetitors,
} from '@/lib/auth/permissions';
import { listCompetitorsForUser } from '@/lib/user-competitors/queries';
import { UserCompetitorsPanel } from '@/components/users/UserCompetitorsPanel';

export const dynamic = 'force-dynamic';

export default async function UserCompetitorsPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewCompetitors(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { rows, error } = await listCompetitorsForUser(params.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Concurrenten</h2>
        <p className="text-sm text-brand-accent">
          competitor_data — beheer via admin (geen mockdata).
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <UserCompetitorsPanel
        userId={params.id}
        rows={rows}
        canMutate={canManageCompetitors(admin.profile.role)}
      />
    </div>
  );
}
