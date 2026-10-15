'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  getFailedPaymentLink,
  refreshPaymentStatus,
  retryFailedPayment,
} from '@/lib/user-billing/actions';
import type { UserPaymentOverview } from '@/lib/user-billing/queries';
import { PaymentIssueBadge } from '@/components/users/PaymentIssueBadge';
import { formatSupportDateTime } from '@/lib/support/labels';
import { subscriptionStatusLabel } from '@/lib/users/types';

type Props = {
  userId: string;
  userLabel: string;
  overview: UserPaymentOverview;
  canRetry: boolean;
};

export function UserPaymentRetryPanel({
  userId,
  userLabel,
  overview,
  canRetry,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(
    overview.openInvoice?.hostedInvoiceUrl ?? null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const invoice = overview.openInvoice;
  const showRetry =
    canRetry &&
    overview.hasPaymentIssue &&
    Boolean(invoice) &&
    invoice!.status === 'open';

  function run(
    action: () => Promise<
      | { ok: true; message?: string; payUrl?: string | null }
      | { ok: false; error: string; payUrl?: string | null }
    >,
  ) {
    setError(null);
    setSuccess(null);
    setCopied(false);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        if (result.payUrl) setPayUrl(result.payUrl);
        return;
      }
      setSuccess(result.message ?? 'Klaar.');
      if ('payUrl' in result && result.payUrl) setPayUrl(result.payUrl);
      router.refresh();
    });
  }

  async function onCopyLink() {
    if (!payUrl) {
      run(async () => {
        const result = await getFailedPaymentLink({ userId });
        if (!result.ok) return result;
        setPayUrl(result.payUrl);
        try {
          await navigator.clipboard.writeText(result.payUrl);
          setCopied(true);
        } catch {
          /* ignore */
        }
        return result;
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      setSuccess('Betaallink gekopieerd.');
    } catch {
      setError('Kopiëren mislukt. Open de link handmatig.');
    }
  }

  return (
    <section className="rounded-card border border-brand-border bg-brand-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-brand-navy">
          Betalingsstatus
        </h3>
        <PaymentIssueBadge badge={overview.badge} />
      </div>

      {overview.stripeError ? (
        <p className="text-sm text-amber-900" role="status">
          {overview.stripeError}
        </p>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Abonnementsstatus
          </dt>
          <dd className="text-sm text-brand-navy">
            {overview.subscription
              ? subscriptionStatusLabel(overview.subscription.status)
              : 'Geen abonnement'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Openstaande / mislukte betaling
          </dt>
          <dd className="text-sm text-brand-navy">
            {overview.hasPaymentIssue ? 'Ja' : 'Nee'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Bedrag openstaand
          </dt>
          <dd className="text-sm text-brand-navy">
            {invoice?.amountLabel ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Factuur-ID
          </dt>
          <dd className="break-all font-mono text-xs text-brand-navy">
            {invoice?.id ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Factuurnummer
          </dt>
          <dd className="text-sm text-brand-navy">
            {invoice?.number ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Mislukt / aangemaakt
          </dt>
          <dd className="text-sm text-brand-navy">
            {invoice?.createdAt
              ? formatSupportDateTime(invoice.createdAt)
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Laatste betaalpoging
          </dt>
          <dd className="text-sm text-brand-navy">
            {invoice?.lastAttemptAt
              ? formatSupportDateTime(invoice.lastAttemptAt)
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Aantal pogingen
          </dt>
          <dd className="text-sm text-brand-navy">
            {invoice ? String(invoice.attemptCount) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Betaalmethode gekoppeld
          </dt>
          <dd className="text-sm text-brand-navy">
            {overview.hasPaymentMethod
              ? overview.paymentMethodLabel || 'Ja'
              : 'Nee'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-brand-accent">
            Posts gepauzeerd (betaalblokkade)
          </dt>
          <dd className="text-sm text-brand-navy">
            {overview.pausedPostsError
              ? overview.pausedPostsError
              : overview.pausedPostsCount > 0
                ? `${overview.pausedPostsCount}`
                : 'Geen'}
          </dd>
        </div>
      </dl>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-green-900" role="status">
          {success}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => refreshPaymentStatus({ userId }))
          }
          className="rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-mist disabled:opacity-60"
        >
          Status verversen
        </button>

        {showRetry ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmOpen(true)}
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
          >
            Betaling opnieuw proberen
          </button>
        ) : null}

        {canRetry && overview.hasPaymentIssue ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await getFailedPaymentLink({ userId });
                  if (!result.ok) return result;
                  setPayUrl(result.payUrl);
                  return result;
                })
              }
              className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm font-medium text-brand-navy hover:border-brand-accent disabled:opacity-60"
            >
              Betaallink ophalen
            </button>
            <button
              type="button"
              disabled={pending || !payUrl}
              onClick={() => {
                if (payUrl) window.open(payUrl, '_blank', 'noopener,noreferrer');
              }}
              className="rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-mist disabled:opacity-60"
            >
              Betaallink openen
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void onCopyLink()}
              className="rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm font-medium text-brand-navy hover:bg-brand-mist disabled:opacity-60"
            >
              {copied ? 'Gekopieerd' : 'Betaallink kopiëren'}
            </button>
          </>
        ) : null}
      </div>

      {!canRetry && overview.hasPaymentIssue ? (
        <p className="text-xs text-brand-accent">
          Alleen superadmins mogen een betaalpoging starten of een betaallink
          ophalen.
        </p>
      ) : null}

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="retry-payment-title"
        >
          <div className="w-full max-w-md space-y-4 rounded-card border border-brand-border bg-brand-white p-5 shadow-lg">
            <h4
              id="retry-payment-title"
              className="text-base font-semibold text-brand-navy"
            >
              Betaling opnieuw proberen?
            </h4>
            <p className="text-sm text-brand-navy">
              Gebruiker: <strong>{userLabel}</strong>
            </p>
            <p className="text-sm text-brand-navy">
              Bedrag: <strong>{invoice?.amountLabel ?? '—'}</strong>
            </p>
            <p className="break-all font-mono text-xs text-brand-accent">
              Factuur: {invoice?.id ?? '—'}
            </p>
            <p className="text-xs text-brand-accent">
              Bij succes werkt de bestaande Stripe-webhook de toegang en
              gepauzeerde posts bij. Deze actie zet de status niet handmatig op
              actief.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmOpen(false)}
                className="rounded-[10px] border border-brand-border px-3 py-2 text-sm text-brand-navy hover:bg-brand-mist"
              >
                Annuleren
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setConfirmOpen(false);
                  run(async () => {
                    const result = await retryFailedPayment({
                      userId,
                      confirm: true,
                    });
                    if (!result.ok) {
                      return {
                        ok: false as const,
                        error: result.error,
                        payUrl: result.payUrl,
                      };
                    }
                    return {
                      ok: true as const,
                      message: result.message,
                      payUrl: result.payUrl,
                    };
                  });
                }}
                className="rounded-[10px] bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
              >
                Bevestigen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
