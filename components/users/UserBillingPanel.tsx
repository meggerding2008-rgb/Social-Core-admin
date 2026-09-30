'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSubscriptionCorrection } from '@/lib/user-billing/actions';
import type { SubscriptionRow } from '@/lib/users/types';
import { planLabel, subscriptionStatusLabel } from '@/lib/users/types';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = {
  userId: string;
  subscription: SubscriptionRow | null;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function UserBillingPanel({
  userId,
  subscription,
  canMutate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    tier: subscription?.tier ?? 'silver',
    status: subscription?.status ?? 'active',
    reason: '',
    confirm: false,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateSubscriptionCorrection({
        userId,
        tier: form.tier,
        status: form.status,
        reason: form.reason,
        confirm: form.confirm,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <h3 className="text-sm font-semibold text-brand-navy">Abonnement (read-only Stripe)</h3>
        {!subscription ? (
          <p className="mt-2 text-sm text-brand-accent">Geen subscriptions-rij.</p>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-brand-accent">Plan</dt>
              <dd className="text-sm text-brand-navy">
                {planLabel(subscription.tier)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-accent">Status</dt>
              <dd className="text-sm text-brand-navy">
                {subscriptionStatusLabel(subscription.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-accent">Stripe customer</dt>
              <dd className="break-all font-mono text-xs text-brand-navy">
                {subscription.stripe_customer_id || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-accent">Stripe subscription</dt>
              <dd className="break-all font-mono text-xs text-brand-navy">
                {subscription.stripe_subscription_id || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-accent">Periode start</dt>
              <dd className="text-sm text-brand-navy">
                {subscription.current_period_start
                  ? formatSupportDateTime(subscription.current_period_start)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-brand-accent">Periode einde</dt>
              <dd className="text-sm text-brand-navy">
                {subscription.current_period_end
                  ? formatSupportDateTime(subscription.current_period_end)
                  : '—'}
              </dd>
            </div>
          </dl>
        )}
      </section>

      {canMutate && subscription ? (
        <form
          onSubmit={onSubmit}
          className="rounded-card border border-amber-200 bg-amber-50/40 p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-brand-navy">
            Lokale correctie (geen Stripe API)
          </h3>
          <p className="text-xs text-brand-accent">
            Past alleen tier/status in Supabase aan. Stripe blijft leidend voor betalingen.
          </p>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-900">{success}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-brand-accent">
              Plan
              <select
                className={field}
                value={form.tier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tier: e.target.value }))
                }
              >
                <option value="silver">Zilver</option>
                <option value="gold">Goud</option>
                <option value="diamond">Diamant</option>
              </select>
            </label>
            <label className="block text-xs text-brand-accent">
              Status
              <select
                className={field}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="active">active</option>
                <option value="trialing">trialing</option>
                <option value="paused">paused</option>
                <option value="cancelled">cancelled</option>
                <option value="past_due">past_due</option>
                <option value="unpaid">unpaid</option>
              </select>
            </label>
          </div>
          <label className="block text-xs text-brand-accent">
            Reden (audit)
            <textarea
              required
              rows={2}
              className={field}
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              checked={form.confirm}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirm: e.target.checked }))
              }
            />
            Ik bevestig deze correctie
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
          >
            Correctie toepassen
          </button>
        </form>
      ) : canMutate ? null : (
        <p className="text-sm text-brand-accent">
          Alleen superadmins mogen abonnementen corrigeren.
        </p>
      )}
    </div>
  );
}
