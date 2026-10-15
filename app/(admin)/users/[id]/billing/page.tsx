import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canManageBilling,
  canViewBilling,
} from '@/lib/auth/permissions';
import { getUserProfile } from '@/lib/users/queries';
import { getUserPaymentOverview } from '@/lib/user-billing/queries';
import { UserBillingPanel } from '@/components/users/UserBillingPanel';
import { UserPaymentRetryPanel } from '@/components/users/UserPaymentRetryPanel';
import { isUserId } from '@/lib/users/validate-id';

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
  if (!isUserId(params.id)) notFound();

  const [{ row: user }, overview] = await Promise.all([
    getUserProfile(params.id),
    getUserPaymentOverview(params.id),
  ]);

  if (!user) notFound();

  const userLabel =
    user.name?.trim() || user.email?.trim() || user.id.slice(0, 8);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Betalingen</h2>
        <p className="text-sm text-brand-accent">
          Abonnementsstatus uit Supabase; openstaande factuur live uit Stripe.
          Herstel van toegang en posts gebeurt uitsluitend via de bestaande
          Stripe-webhook.
        </p>
      </div>

      {overview.subscriptionError ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {overview.subscriptionError}
        </div>
      ) : null}

      <UserPaymentRetryPanel
        userId={user.id}
        userLabel={userLabel}
        overview={overview}
        canRetry={canManageBilling(admin.profile.role)}
      />

      <UserBillingPanel
        userId={user.id}
        subscription={overview.subscription}
        canMutate={canManageBilling(admin.profile.role)}
      />
    </div>
  );
}
