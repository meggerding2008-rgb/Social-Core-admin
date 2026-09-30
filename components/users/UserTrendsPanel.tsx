'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTrendStatus } from '@/lib/user-trends/actions';
import {
  TREND_STATUSES,
  trendStatusLabel,
  type UserTrendRow,
} from '@/lib/user-trends/types';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = {
  userId: string;
  rows: UserTrendRow[];
  canMutate: boolean;
};

export function UserTrendsPanel({ userId, rows, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onStatus(trendId: string, status: string) {
    if (!canMutate) return;
    setError(null);
    startTransition(async () => {
      const result = await updateTrendStatus({ userId, trendId, status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-brand-accent">Geen trend_items voor deze gebruiker.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-card border border-brand-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-brand-border bg-brand-cream/40 text-xs uppercase tracking-wide text-brand-accent">
            <tr>
              <th className="px-3 py-2">Titel</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Scores</th>
              <th className="px-3 py-2">Gedetecteerd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {rows.map((row) => (
              <tr key={row.id} className="text-brand-navy">
                <td className="px-3 py-2 align-top">
                  <div className="font-medium">{row.title}</div>
                  {row.summary ? (
                    <p className="mt-1 line-clamp-2 text-xs text-brand-accent">
                      {row.summary}
                    </p>
                  ) : null}
                  {row.source_url ? (
                    <a
                      href={row.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-brand-navy underline"
                    >
                      Bron
                    </a>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-top">{row.platform}</td>
                <td className="px-3 py-2 align-top">
                  {canMutate ? (
                    <select
                      disabled={pending}
                      value={row.status}
                      onChange={(e) => onStatus(row.id, e.target.value)}
                      className="rounded-[8px] border border-brand-border bg-brand-white px-2 py-1 text-sm"
                    >
                      {TREND_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {trendStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    trendStatusLabel(row.status)
                  )}
                </td>
                <td className="px-3 py-2 align-top text-xs">
                  Relevantie {row.relevance_score} · Kans {row.opportunity_score}
                </td>
                <td className="px-3 py-2 align-top text-xs">
                  {row.detected_at
                    ? formatSupportDateTime(row.detected_at)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
