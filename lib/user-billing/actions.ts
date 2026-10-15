'use server';

import { revalidatePath } from 'next/cache';
import type Stripe from 'stripe';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageBilling, canViewBilling } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import { formatMoneyCents } from '@/lib/user-billing/payment-labels';
import { resolveOpenInvoiceForUser } from '@/lib/user-billing/queries';
import { normalizePlanSlug } from '@/lib/users/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export type PaymentRetryResult =
  | {
      ok: true;
      outcome: 'paid' | 'requires_action' | 'link_only';
      message: string;
      invoiceId: string;
      amountLabel: string;
      payUrl: string | null;
      stripeStatus: string | null;
    }
  | {
      ok: false;
      error: string;
      payUrl?: string | null;
      invoiceId?: string | null;
      amountLabel?: string | null;
    };

export type PaymentLinkResult =
  | {
      ok: true;
      payUrl: string;
      source: 'hosted_invoice' | 'customer_portal';
      invoiceId: string | null;
      amountLabel: string | null;
      message: string;
    }
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

async function recentlyLoggedRetry(
  actorId: string,
  invoiceId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 15_000).toISOString();
  const { data } = await supabase
    .from('admin_audit_logs')
    .select('id, metadata, created_at')
    .eq('actor_id', actorId)
    .eq('action', 'user.subscription.payment_retry')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);

  return (data ?? []).some((row) => {
    const meta = row.metadata as Record<string, unknown> | null;
    return meta && meta.invoiceId === invoiceId;
  });
}

function safeStripePayError(error: unknown): string {
  if (error && typeof error === 'object' && 'type' in error) {
    const stripeErr = error as Stripe.errors.StripeError;
    if (stripeErr.code === 'invoice_payment_intent_requires_action') {
      return 'Extra bevestiging van de klant is vereist. Gebruik de betaallink.';
    }
    if (stripeErr.code === 'card_declined') {
      return 'De opgeslagen betaalmethode is geweigerd. Gebruik de betaallink.';
    }
    if (stripeErr.code === 'invoice_no_payment_method') {
      return 'Geen geldige betaalmethode beschikbaar. Gebruik de betaallink.';
    }
    if (stripeErr.message) {
      // Never surface raw Stripe internals beyond short known codes
      return 'Stripe kon de factuur niet direct innen. Gebruik de betaallink.';
    }
  }
  return toSafeErrorMessage(error, 'Betaalpoging mislukt.');
}

/**
 * Retry open invoice for a Social Core user.
 * Client may only pass userId. Stripe IDs are resolved server-side from DB.
 * Does NOT set subscription to active — webhooks remain the restore path.
 */
export async function retryFailedPayment(input: {
  userId: string;
  confirm: boolean;
}): Promise<PaymentRetryResult> {
  try {
    const admin = await requireBillingMutator();
    if (!input.confirm) {
      throw new AppError('Bevestig de betaalpoging eerst.');
    }
    if (!isStripeConfigured()) {
      throw new AppError('STRIPE_SECRET_KEY is niet geconfigureerd op de admin-app.');
    }

    const { subscription, customerId, invoice } =
      await resolveOpenInvoiceForUser(input.userId);

    if (await recentlyLoggedRetry(admin.id, invoice.id)) {
      return {
        ok: true,
        outcome: 'link_only',
        message:
          'Een recente poging is al gestart. Wacht even of ververs de status. Geen dubbele auditregel.',
        invoiceId: invoice.id,
        amountLabel: formatMoneyCents(invoice.amount_due ?? 0, invoice.currency),
        payUrl: invoice.hosted_invoice_url ?? null,
        stripeStatus: invoice.status ?? null,
      };
    }

    const amountLabel = formatMoneyCents(
      invoice.amount_due ?? 0,
      invoice.currency,
    );
    const stripe = getStripe();
    let paidInvoice: Stripe.Invoice | null = null;
    let payError: unknown = null;

    try {
      paidInvoice = await stripe.invoices.pay(
        invoice.id,
        {},
        { idempotencyKey: `admin-invoice-pay-${invoice.id}` },
      );
    } catch (err) {
      payError = err;
    }

    if (paidInvoice?.status === 'paid') {
      await logAdminAction({
        actorId: admin.id,
        action: 'user.subscription.payment_retry',
        resourceType: 'subscriptions',
        resourceId: subscription.id,
        beforeState: {
          status: subscription.status,
          invoiceStatus: invoice.status,
        },
        afterState: {
          stripeInvoiceStatus: 'paid',
          localStatusUnchanged: true,
        },
        metadata: {
          userId: input.userId,
          stripeCustomerId: customerId,
          invoiceId: invoice.id,
          outcome: 'paid',
          stripeApiCalled: true,
          amountDueCents: invoice.amount_due ?? 0,
          currency: invoice.currency,
        },
      });

      revalidateBillingPaths(input.userId);
      return {
        ok: true,
        outcome: 'paid',
        message:
          'Stripe bevestigt de betaling als geslaagd. Abonnementsstatus en posts worden bijgewerkt via de bestaande webhook — ververs over enkele seconden.',
        invoiceId: invoice.id,
        amountLabel,
        payUrl: null,
        stripeStatus: 'paid',
      };
    }

    // Payment not completed off-session — offer hosted URL / portal
    const userAppBase =
      process.env.NEXT_PUBLIC_USER_APP_URL?.replace(/\/$/, '') ||
      'https://app.socialcore.nl';
    const payUrl =
      invoice.hosted_invoice_url ??
      (
        await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${userAppBase}/betalingen`,
        })
      ).url;

    const requiresAction =
      payError &&
      typeof payError === 'object' &&
      'code' in payError &&
      String((payError as { code?: string }).code) ===
        'invoice_payment_intent_requires_action';

    await logAdminAction({
      actorId: admin.id,
      action: 'user.subscription.payment_retry',
      resourceType: 'subscriptions',
      resourceId: subscription.id,
      beforeState: {
        status: subscription.status,
        invoiceStatus: invoice.status,
      },
      afterState: {
        stripeInvoiceStatus: paidInvoice?.status ?? invoice.status,
        outcome: requiresAction ? 'requires_action' : 'failed_off_session',
      },
      metadata: {
        userId: input.userId,
        stripeCustomerId: customerId,
        invoiceId: invoice.id,
        outcome: requiresAction ? 'requires_action' : 'link_fallback',
        stripeApiCalled: true,
        stripeErrorCode:
          payError &&
          typeof payError === 'object' &&
          'code' in payError
            ? String((payError as { code?: string }).code ?? '')
            : null,
        amountDueCents: invoice.amount_due ?? 0,
        currency: invoice.currency,
        payLinkProvided: Boolean(payUrl),
      },
    });

    revalidateBillingPaths(input.userId);

    if (requiresAction) {
      return {
        ok: true,
        outcome: 'requires_action',
        message:
          'Extra actie van de klant is vereist. Open of kopieer de betaallink.',
        invoiceId: invoice.id,
        amountLabel,
        payUrl: payUrl ?? null,
        stripeStatus: invoice.status ?? null,
      };
    }

    return {
      ok: false,
      error: safeStripePayError(payError),
      payUrl: payUrl ?? null,
      invoiceId: invoice.id,
      amountLabel,
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Betaalpoging mislukt.'),
    };
  }
}

/** Hosted invoice URL or Customer Portal — IDs resolved server-side from userId only. */
export async function getFailedPaymentLink(input: {
  userId: string;
}): Promise<PaymentLinkResult> {
  try {
    const admin = await requireBillingMutator();
    if (!isStripeConfigured()) {
      throw new AppError('STRIPE_SECRET_KEY is niet geconfigureerd op de admin-app.');
    }

    const { subscription, customerId, invoice } =
      await resolveOpenInvoiceForUser(input.userId);

    const stripe = getStripe();
    let payUrl = invoice.hosted_invoice_url ?? null;
    let source: 'hosted_invoice' | 'customer_portal' = 'hosted_invoice';

    if (!payUrl) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url:
          (process.env.NEXT_PUBLIC_USER_APP_URL?.replace(/\/$/, '') ||
            'https://app.socialcore.nl') + '/betalingen',
      });
      payUrl = portal.url;
      source = 'customer_portal';
    }

    if (!payUrl) {
      throw new AppError('Geen veilige betaallink beschikbaar.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.subscription.payment_link',
      resourceType: 'subscriptions',
      resourceId: subscription.id,
      metadata: {
        userId: input.userId,
        stripeCustomerId: customerId,
        invoiceId: invoice.id,
        source,
        stripeApiCalled: true,
        // Do not store full pay URL in audit
      },
    });

    return {
      ok: true,
      payUrl,
      source,
      invoiceId: invoice.id,
      amountLabel: formatMoneyCents(invoice.amount_due ?? 0, invoice.currency),
      message:
        source === 'hosted_invoice'
          ? 'Stripe-factuurlink klaargezet (niet gelogd in audit).'
          : 'Customer Portal-link klaargezet.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Betaallink ophalen mislukt.'),
    };
  }
}

/** Refresh billing UI; optionally re-read Stripe without mutating local status. */
export async function refreshPaymentStatus(input: {
  userId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!canViewBilling(admin.profile.role)) {
      throw new AppError('Geen rechten om betalingen te bekijken.');
    }
    revalidateBillingPaths(input.userId);
    return {
      ok: true,
      message:
        'Status ververst. Definitief herstel van toegang gebeurt via de Stripe-webhook.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Verversen mislukt.'),
    };
  }
}
