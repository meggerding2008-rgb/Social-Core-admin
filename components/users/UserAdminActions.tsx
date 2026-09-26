'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  activateUserAccount,
  blockUserAccount,
  sendUserPasswordReset,
  updateUserProfileFields,
} from '@/lib/users/actions';
import type { UserProfileRow } from '@/lib/users/types';

type Props = {
  user: UserProfileRow;
  canMutate: boolean;
};

const fieldClass =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function UserAdminActions({ user, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reason, setReason] = useState(user.blocked_reason ?? '');
  const [form, setForm] = useState({
    name: user.name ?? '',
    company: user.company ?? '',
    phone: user.phone ?? '',
    job_title: user.job_title ?? '',
    industry: user.industry ?? '',
    description: user.description ?? '',
  });

  if (!canMutate) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5">
        <p className="text-sm text-brand-accent">
          Alleen superadmins mogen accounts blokkeren, activeren of gegevens
          wijzigen. Jouw rol heeft alleen leesrechten.
        </p>
      </div>
    );
  }

  function run(
    action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      router.refresh();
    });
  }

  function onSaveProfile(event: FormEvent) {
    event.preventDefault();
    run(() =>
      updateUserProfileFields({
        userId: user.id,
        ...form,
      }),
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <form
        onSubmit={onSaveProfile}
        className="rounded-card border border-brand-border bg-brand-white p-5"
      >
        <h2 className="text-sm font-semibold text-brand-navy">
          Gegevens aanpassen
        </h2>
        <p className="mt-1 text-xs text-brand-accent">
          E-mail wijzigen gebeurt niet hier (Auth-sync). Geen destructieve
          acties.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['name', 'Naam'],
              ['company', 'Bedrijf'],
              ['phone', 'Telefoon'],
              ['job_title', 'Functie'],
              ['industry', 'Branche'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs font-medium text-brand-navy">
              {label}
              <input
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className={fieldClass}
                required={key === 'name'}
              />
            </label>
          ))}
        </div>

        <label className="mt-3 block text-xs font-medium text-brand-navy">
          Beschrijving
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className={fieldClass}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
        >
          {pending ? 'Bezig…' : 'Gegevens opslaan'}
        </button>
      </form>

      <div className="rounded-card border border-brand-border bg-brand-white p-5">
        <h2 className="text-sm font-semibold text-brand-navy">Accountacties</h2>

        {user.account_status === 'blocked' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => activateUserAccount({ userId: user.id }))}
            className="mt-3 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
          >
            Account activeren
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-medium text-brand-navy">
              Reden blokkade (optioneel)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={fieldClass}
                placeholder="Korte interne toelichting"
              />
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  blockUserAccount({ userId: user.id, reason }),
                )
              }
              className="rounded-[10px] border border-red-700 bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              Account tijdelijk blokkeren
            </button>
          </div>
        )}

        <div className="mt-5 border-t border-brand-border pt-4">
          <p className="text-xs text-brand-accent">
            Wachtwoordreset via Supabase Auth Admin API. De recovery-URL wordt
            nooit gelogd.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => sendUserPasswordReset({ userId: user.id }))
            }
            className="mt-3 rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist disabled:opacity-60"
          >
            Wachtwoordreset starten
          </button>
        </div>
      </div>
    </div>
  );
}
