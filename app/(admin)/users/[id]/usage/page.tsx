import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManageBilling, canViewUsage } from '@/lib/auth/permissions';
import { getUserUsageCurrentMonth } from '@/lib/users/queries';
import { listUsageHistoryForUser } from '@/lib/user-usage/queries';
import { UserUsagePanel } from '@/components/users/UserUsagePanel';

export const dynamic = 'force-dynamic';

export default async function UserUsagePage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewUsage(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const [currentResult, historyResult] = await Promise.all([
    getUserUsageCurrentMonth(params.id),
    listUsageHistoryForUser(params.id),
  ]);

  const errors = [currentResult.error, historyResult.error].filter(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Verbruik</h2>
        <p className="text-sm text-brand-accent">
          Maandlimieten uit `usage`. Correcties alleen voor superadmin.
        </p>
      </div>
      {errors.length > 0 ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.join(' ')}
        </div>
      ) : null}
      <UserUsagePanel
        userId={params.id}
        current={currentResult.row}
        history={historyResult.rows}
        canMutate={canManageBilling(admin.profile.role)}
      />
    </div>
  );
}
