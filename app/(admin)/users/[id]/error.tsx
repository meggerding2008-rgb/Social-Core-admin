'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function UserDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[users/detail] render failed:', error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <div
        className="rounded-card border border-red-200 bg-red-50 px-5 py-4"
        role="alert"
      >
        <h2 className="text-lg font-semibold text-red-900">
          Gebruikerspagina kon niet worden geladen
        </h2>
        <p className="mt-2 text-sm text-red-800">
          Er ging iets mis bij het ophalen of tonen van deze gebruiker. Probeer
          opnieuw of ga terug naar de gebruikerslijst.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-red-700">
            Referentie: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent"
        >
          Opnieuw proberen
        </button>
        <Link
          href="/users"
          className="rounded-[10px] border border-brand-border bg-brand-white px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-mist"
        >
          Terug naar gebruikers
        </Link>
      </div>
    </div>
  );
}
