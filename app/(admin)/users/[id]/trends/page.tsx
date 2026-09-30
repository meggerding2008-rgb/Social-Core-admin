import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canManageTrends,
  canViewTrends,
} from '@/lib/auth/permissions';
import { listTrendsForUser } from '@/lib/user-trends/queries';
import { UserTrendsPanel } from '@/components/users/UserTrendsPanel';

export const dynamic = 'force-dynamic';

export default async function UserTrendsPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewTrends(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { rows, error } = await listTrendsForUser(params.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Trends</h2>
        <p className="text-sm text-brand-accent">
          trend_items voor deze gebruiker. Status wijzigen: content/superadmin.
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <UserTrendsPanel
        userId={params.id}
        rows={rows}
        canMutate={canManageTrends(admin.profile.role)}
      />
    </div>
  );
}
