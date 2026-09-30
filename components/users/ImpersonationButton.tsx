'use client';

import { useState, useTransition } from 'react';
import { startImpersonation } from '@/lib/impersonation/actions';

type Props = {
  userId: string;
  canImpersonate: boolean;
};

const fieldClass =
  'mt-2 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function ImpersonationButton({ userId, canImpersonate }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!canImpersonate) return null;

  function onGenerate() {
    if (!confirmed) {
      setError('Bevestig eerst dat je impersonatie begrijpt.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await startImpersonation({ userId });
      if (!result.ok) {
        setError(result.error);
        setLink(null);
        return;
      }
      setLink(result.actionLink);
    });
  }

  return (
    <div className="rounded-card border border-amber-200 bg-amber-50/80 p-5">
      <h2 className="text-sm font-semibold text-brand-navy">Impersonatie</h2>
      <p className="mt-1 text-xs text-brand-accent">
        Alleen superadmin. Genereert een magic link (geen wachtwoord). Open
        handmatig in een apart venster. Stoppen: uitloggen in de gebruikersapp
        of venster sluiten.
      </p>

      <label className="mt-3 flex items-start gap-2 text-xs text-brand-navy">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Ik begrijp dat ik als deze gebruiker kan handelen en dit auditbaar is.
        </span>
      </label>

      {error ? (
        <div
          className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {link ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-brand-navy">Magic link</p>
          <input
            readOnly
            value={link}
            className={fieldClass}
            onFocus={(e) => e.target.select()}
          />
          <p className="text-xs text-brand-accent">
            De link wordt niet automatisch geopend. Deel niet publiek.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={onGenerate}
        className="mt-4 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
      >
        {pending ? 'Bezig…' : link ? 'Nieuwe link genereren' : 'Impersonatie-link maken'}
      </button>
    </div>
  );
}
