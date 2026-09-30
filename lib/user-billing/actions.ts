'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageBilling } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { normalizePlanSlug } from '@/lib/users/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const ALLOWED_STATUSES = [
  'active',
  'trialing',
  'paused',
  'cancelled',
  'canceled',
  'past_due',
  'unpaid',
] as const;

async function requireBillingMutator() {
  const admin = await requireAdmin();
  if (!canManageBilling(admin.profile.role)) {
    throw new AppError('Alleen superadmins mogen abonnementen corrigeren.');
  }
  return admin;
}

function revalidateBillingPaths(userId: string) {
  revalidatePath(`/users/${userId}/billing`);
  revalidatePath(`/users/${userId}`);
  revalidatePath('/users');
}

export async function updateSubscriptionCorrection(input: {
  userId: string;
  tier: string;
  status: string;
  reason: string;
  confirm: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireBillingMutator();
    if (!input.confirm) {
      throw new AppError('Bevestig de correctie via het vinkje.');
    }

    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new AppError('Geef een korte reden (min. 5 tekens).');
    }

    const tier = normalizePlanSlug(input.tier);
    if (!['silver', 'gold', 'diamond'].includes(tier)) {
      throw new AppError('Ongeldig plan.');
    }

    const status = input.status.trim().toLowerCase();
    if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      throw new AppError('Ongeldige abonnementsstatus.');
    }

    const supabase = await createClient();
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, tier, status')
      .eq('user_id', input.userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error('[user-billing] load failed:', subError.message);
      throw new AppError('Abonnement kon niet worden geladen.');
    }
    if (!sub) {
      throw new AppError(
        'Geen abonnementsrecord gevonden. Maak eerst een rij aan via de gebruikersapp of Stripe-webhook.',
      );
    }

    const now = new Date().toISOString();
    const { error: updateSubError } = await supabase
      .from('subscriptions')
      .update({ tier, status, updated_at: now })
      .eq('id', sub.id)
      .eq('user_id', input.userId);

    if (updateSubError) {
      console.error('[user-billing] update failed:', updateSubError.message);
      throw new AppError('Abonnement kon niet worden bijgewerkt.');
    }

    const { error: userError } = await supabase
      .from('users')
      .update({ subscription_tier: tier })
      .eq('id', input.userId);

    if (userError) {
      console.error('[user-billing] user tier failed:', userError.message);
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.subscription.correction',
      resourceType: 'subscriptions',
      resourceId: sub.id,
      beforeState: { tier: sub.tier, status: sub.status },
      afterState: { tier, status },
      metadata: {
        userId: input.userId,
        reason,
        stripeApiCalled: false,
      },
    });

    revalidateBillingPaths(input.userId);
    return {
      ok: true,
      message:
        'Abonnement lokaal gecorrigeerd (geen Stripe API). Controleer Stripe indien nodig.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Correctie mislukt.'),
    };
  }
}
