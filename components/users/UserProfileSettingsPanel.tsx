'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserProfileExtended } from '@/lib/users/actions';
import type { UserProfileRow } from '@/lib/users/types';

type Props = {
  user: UserProfileRow;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function UserProfileSettingsPanel({ user, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    website: user.website ?? '',
    language: user.language ?? '',
    timezone: user.timezone ?? '',
    onboarding_completed: user.onboarding_completed,
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canMutate) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateUserProfileExtended({
        userId: user.id,
        ...form,
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
    <form
      onSubmit={onSubmit}
      className="rounded-card border border-brand-border bg-brand-white p-5"
    >
      <h3 className="text-sm font-semibold text-brand-navy">
        Profiel & onboarding
      </h3>
      <p className="mt-1 text-xs text-brand-accent">
        Uitgebreide velden (superadmin). Basisprofiel staat hieronder via
        accountacties.
      </p>

      {error ? (
        <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-3 rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      {!canMutate ? (
        <p className="mt-3 text-sm text-brand-accent">Alleen lezen.</p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-brand-navy">
          Website
          <input
            value={form.website}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, website: e.target.value }))
            }
            disabled={!canMutate || pending}
            className={field}
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Taal
          <input
            value={form.language}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, language: e.target.value }))
            }
            disabled={!canMutate || pending}
            className={field}
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy sm:col-span-2">
          Tijdzone
          <input
            value={form.timezone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, timezone: e.target.value }))
            }
            disabled={!canMutate || pending}
            className={field}
            placeholder="Europe/Amsterdam"
          />
        </label>
      </div>

      <label className="mt-4 flex items-center gap-2 text-xs font-medium text-brand-navy">
        <input
          type="checkbox"
          checked={form.onboarding_completed}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              onboarding_completed: e.target.checked,
            }))
          }
          disabled={!canMutate || pending}
        />
        Onboarding afgerond
      </label>

      {canMutate ? (
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-accent disabled:opacity-60"
        >
          {pending ? 'Bezig…' : 'Profiel opslaan'}
        </button>
      ) : null}
    </form>
  );
}
