'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContentSettings } from '@/lib/user-settings/actions';
import type { ContentSettingsRow } from '@/lib/user-settings/types';

type Props = {
  userId: string;
  row: ContentSettingsRow | null;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function UserContentSettingsPanel({ userId, row, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    brand_name: row?.brand_name ?? '',
    brand_description: row?.brand_description ?? '',
    brand_voice: row?.brand_voice ?? '',
    target_audience: row?.target_audience ?? '',
    scheduling_mode: row?.scheduling_mode ?? '',
    generation_timezone: row?.generation_timezone ?? '',
  });

  if (!row) {
    return (
      <p className="text-sm text-brand-accent">
        Geen content_settings-rij voor deze gebruiker.
      </p>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canMutate) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateContentSettings({
        userId,
        patch: form,
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
      className="space-y-4 rounded-card border border-brand-border bg-brand-white p-5"
    >
      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      {!canMutate ? (
        <p className="text-sm text-brand-accent">
          Alleen superadmins mogen deze velden wijzigen.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ['brand_name', 'Merknaam'],
            ['scheduling_mode', 'Planningsmodus'],
            ['generation_timezone', 'Generatie-tijdzone'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs font-medium text-brand-navy">
            {label}
            <input
              value={form[key]}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, [key]: e.target.value }))
              }
              disabled={!canMutate || pending}
              className={field}
            />
          </label>
        ))}
      </div>

      {(
        [
          ['brand_description', 'Merkbeschrijving'],
          ['brand_voice', 'Merkstem'],
          ['target_audience', 'Doelgroep'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block text-xs font-medium text-brand-navy">
          {label}
          <textarea
            value={form[key]}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, [key]: e.target.value }))
            }
            disabled={!canMutate || pending}
            rows={3}
            className={field}
          />
        </label>
      ))}

      {canMutate ? (
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-accent disabled:opacity-60"
        >
          {pending ? 'Bezig…' : 'Contentinstellingen opslaan'}
        </button>
      ) : null}
    </form>
  );
}
