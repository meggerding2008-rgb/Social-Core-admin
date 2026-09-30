'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { revalidateUserStatistics } from '@/lib/user-stats/actions';

export function RefreshUserStatisticsButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          setError(null);
          startTransition(async () => {
            const result = await revalidateUserStatistics({ userId });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setMessage(result.message ?? 'Vernieuwd.');
            router.refresh();
          });
        }}
        className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
      >
        {pending ? 'Bezig…' : 'Statistieken vernieuwen'}
      </button>
      {message ? (
        <p className="text-sm text-brand-navy">{message}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
