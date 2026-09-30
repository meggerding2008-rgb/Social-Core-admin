import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canManageBilling,
  canViewBilling,
} from '@/lib/auth/permissions';
import { getUserSubscription } from '@/lib/users/queries';
import { UserBillingPanel } from '@/components/users/UserBillingPanel';

export const dynamic = 'force-dynamic';

export default async function UserBillingPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewBilling(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { row, error } = await getUserSubscription(params.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Betalingen</h2>
        <p className="text-sm text-brand-accent">
          Abonnement uit `subscriptions`. Stripe-IDs alleen ter inzage — geen
          Stripe API in admin.
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <UserBillingPanel
        userId={params.id}
        subscription={row}
        canMutate={canManageBilling(admin.profile.role)}
      />
    </div>
  );
}
