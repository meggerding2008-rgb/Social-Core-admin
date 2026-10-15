import type Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { AppError } from '@/lib/errors/safe-error';
import { getStripe, isStripeConfigured } from '@/lib/stripe/client';
import {
  formatMoneyCents,
  isPaymentIssueStatus,
  type PaymentIssueBadge,
} from '@/lib/user-billing/payment-labels';
import type { SubscriptionRow } from '@/lib/users/types';
import { getUserSubscription } from '@/lib/users/queries';

export type OpenInvoiceSummary = {
  id: string;
  number: string | null;
  amountDueCents: number;
  currency: string;
  amountLabel: string;
  status: string | null;
  attempted: boolean;
  attemptCount: number;
  createdAt: string | null;
  lastAttemptAt: string | null;
  nextPaymentAttemptAt: string | null;
  hostedInvoiceUrl: string | null;
  indicatesFailedPayment: boolean;
};

export type UserPaymentOverview = {
  subscription: SubscriptionRow | null;
  subscriptionError: string | null;
  stripeConfigured: boolean;
  stripeError: string | null;
  hasPaymentIssue: boolean;
  badge: PaymentIssueBadge;
  openInvoice: OpenInvoiceSummary | null;
  hasPaymentMethod: boolean;
  paymentMethodLabel: string | null;
  pausedPostsCount: number;
  pausedPostsError: string | null;
};

function invoiceIndicatesFailedPayment(invoice: Stripe.Invoice): boolean {
  if (invoice.status === 'void' || invoice.status === 'uncollectible') {
    return (invoice.amount_due ?? 0) > 0;
  }
  if (invoice.status !== 'open') return false;
  const amountDue = invoice.amount_due ?? 0;
  if (amountDue <= 0) return false;
  const attempted =
    invoice.attempted === true || (invoice.attempt_count ?? 0) > 0;
  const renewal =
    invoice.billing_reason === 'subscription_cycle' ||
    invoice.billing_reason === 'subscription_update' ||
    invoice.billing_reason === 'subscription_threshold';
  return attempted || renewal;
}

function toUnixIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function mapOpenInvoice(invoice: Stripe.Invoice): OpenInvoiceSummary {
  const amountDue = invoice.amount_due ?? 0;
  const currency = invoice.currency || 'eur';
  return {
    id: invoice.id,
    number: invoice.number ?? null,
    amountDueCents: amountDue,
    currency,
    amountLabel: formatMoneyCents(amountDue, currency),
    status: invoice.status ?? null,
    attempted:
      invoice.attempted === true || (invoice.attempt_count ?? 0) > 0,
    attemptCount: invoice.attempt_count ?? 0,
    createdAt: toUnixIso(invoice.created),
    lastAttemptAt: toUnixIso(invoice.status_transitions?.finalized_at) ??
      toUnixIso(invoice.created),
    nextPaymentAttemptAt: toUnixIso(invoice.next_payment_attempt),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    indicatesFailedPayment: invoiceIndicatesFailedPayment(invoice),
  };
}

function resolveBadge(input: {
  status: string | null | undefined;
  openInvoice: OpenInvoiceSummary | null;
}): PaymentIssueBadge {
  const status = String(input.status ?? '').toLowerCase();
  if (!status) return 'none';
  if (status === 'active' || status === 'trialing') {
    if (input.openInvoice?.indicatesFailedPayment) return 'payment_failed';
    if (input.openInvoice) return 'payment_open';
    return 'active';
  }
  if (status === 'cancelled' || status === 'canceled') return 'none';
  if (input.openInvoice?.indicatesFailedPayment || status === 'past_due' || status === 'unpaid') {
    return 'payment_failed';
  }
  if (input.openInvoice) return 'payment_open';
  if (isPaymentIssueStatus(status)) return 'paused';
  return 'none';
}

async function countPausedPosts(userId: string): Promise<{
  count: number;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('payment_hold_at', 'is', null);

    if (error) {
      if (
        error.message.includes('payment_hold_at') ||
        error.code === '42703'
      ) {
        return { count: 0, error: null };
      }
      console.error('[user-billing] paused posts count:', error.message);
      return { count: 0, error: 'Gepauzeerde posts konden niet worden geteld.' };
    }
    return { count: count ?? 0, error: null };
  } catch (err) {
    console.error(
      '[user-billing] paused posts unexpected:',
      err instanceof Error ? err.message : 'unknown',
    );
    return { count: 0, error: null };
  }
}

async function loadStripePaymentDetails(customerId: string): Promise<{
  openInvoice: OpenInvoiceSummary | null;
  hasPaymentMethod: boolean;
  paymentMethodLabel: string | null;
  error: string | null;
}> {
  try {
    const stripe = getStripe();
    const [invoices, customer] = await Promise.all([
      stripe.invoices.list({
        customer: customerId,
        status: 'open',
        limit: 5,
      }),
      stripe.customers.retrieve(customerId),
    ]);

    const preferred =
      invoices.data.find((inv) => invoiceIndicatesFailedPayment(inv)) ??
      invoices.data.find((inv) => Boolean(inv.hosted_invoice_url)) ??
      invoices.data[0] ??
      null;

    let hasPaymentMethod = false;
    let paymentMethodLabel: string | null = null;

    if (!('deleted' in customer && customer.deleted)) {
      const defaultPm = customer.invoice_settings?.default_payment_method;
      const defaultId =
        typeof defaultPm === 'string'
          ? defaultPm
          : defaultPm && typeof defaultPm === 'object'
            ? defaultPm.id
            : null;

      if (defaultId || customer.default_source) {
        hasPaymentMethod = true;
        paymentMethodLabel = 'Opgeslagen betaalmethode aanwezig';
      } else {
        const methods = await stripe.paymentMethods.list({
          customer: customerId,
          limit: 1,
        });
        if (methods.data.length > 0) {
          hasPaymentMethod = true;
          paymentMethodLabel = 'Opgeslagen betaalmethode aanwezig';
        }
      }
    }

    return {
      openInvoice: preferred ? mapOpenInvoice(preferred) : null,
      hasPaymentMethod,
      paymentMethodLabel,
      error: null,
    };
  } catch (err) {
    console.error(
      '[user-billing] stripe payment details:',
      err instanceof Error ? err.message : 'unknown',
    );
    return {
      openInvoice: null,
      hasPaymentMethod: false,
      paymentMethodLabel: null,
      error:
        'Stripe-betalingsstatus kon niet worden opgehaald. Controleer STRIPE_SECRET_KEY.',
    };
  }
}

/**
 * Subscription row + live Stripe open-invoice snapshot for admin display.
 * Never mutates DB status — webhooks remain source of truth for restores.
 */
export async function getUserPaymentOverview(
  userId: string,
): Promise<UserPaymentOverview> {
  const { row: subscription, error: subscriptionError } =
    await getUserSubscription(userId);
  const paused = await countPausedPosts(userId);

  const stripeConfigured = isStripeConfigured();
  let openInvoice: OpenInvoiceSummary | null = null;
  let hasPaymentMethod = false;
  let paymentMethodLabel: string | null = null;
  let stripeError: string | null = null;

  const customerId = subscription?.stripe_customer_id?.trim() || null;
  if (stripeConfigured && customerId) {
    const stripeDetails = await loadStripePaymentDetails(customerId);
    openInvoice = stripeDetails.openInvoice;
    hasPaymentMethod = stripeDetails.hasPaymentMethod;
    paymentMethodLabel = stripeDetails.paymentMethodLabel;
    stripeError = stripeDetails.error;
  } else if (!stripeConfigured && isPaymentIssueStatus(subscription?.status)) {
    stripeError =
      'STRIPE_SECRET_KEY ontbreekt — openstaande factuurdetails zijn niet beschikbaar.';
  }

  const hasPaymentIssue =
    isPaymentIssueStatus(subscription?.status) ||
    Boolean(openInvoice && (openInvoice.indicatesFailedPayment || openInvoice.amountDueCents > 0));

  return {
    subscription,
    subscriptionError,
    stripeConfigured,
    stripeError,
    hasPaymentIssue,
    badge: resolveBadge({
      status: subscription?.status,
      openInvoice,
    }),
    openInvoice,
    hasPaymentMethod,
    paymentMethodLabel,
    pausedPostsCount: paused.count,
    pausedPostsError: paused.error,
  };
}

/** Resolve open invoice for a trusted DB customer — never trust browser Stripe IDs. */
export async function resolveOpenInvoiceForUser(userId: string): Promise<{
  subscription: SubscriptionRow;
  customerId: string;
  invoice: Stripe.Invoice;
}> {
  const { row: subscription, error } = await getUserSubscription(userId);
  if (error || !subscription) {
    throw new AppError('Abonnement niet gevonden.');
  }
  const customerId = subscription.stripe_customer_id?.trim();
  if (!customerId) {
    throw new AppError('Geen Stripe-klant gekoppeld aan dit account.');
  }

  const stripe = getStripe();
  const invoices = await stripe.invoices.list({
    customer: customerId,
    status: 'open',
    limit: 5,
  });

  const invoice =
    invoices.data.find((inv) => invoiceIndicatesFailedPayment(inv)) ??
    invoices.data.find((inv) => (inv.amount_due ?? 0) > 0) ??
    invoices.data[0] ??
    null;

  if (!invoice) {
    throw new AppError('Geen openstaande factuur gevonden voor deze klant.');
  }

  const invoiceCustomer =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;
  if (!invoiceCustomer || invoiceCustomer !== customerId) {
    throw new AppError('Factuur hoort niet bij deze klant.');
  }

  if (invoice.status !== 'open') {
    throw new AppError('Factuur staat niet meer open of is al betaald.');
  }

  return { subscription, customerId, invoice };
}
