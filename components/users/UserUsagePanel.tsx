'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { correctUserUsage } from '@/lib/user-usage/actions';
import type { UsageRow } from '@/lib/users/types';

type Props = {
  userId: string;
  current: UsageRow | null;
  history: UsageRow[];
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

function usageLine(
  label: string,
  used: number | null | undefined,
  limit: number | null | undefined,
) {
  const u = used ?? 0;
  const lim = limit == null ? '∞' : String(limit);
  return `${label}: ${u} / ${lim}`;
}

export function UserUsagePanel({
  userId,
  current,
  history,
  canMutate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    month: current?.month ?? new Date().toISOString().slice(0, 7),
    postsUsed: current ? String(current.posts_used) : '',
    aiGenerationsUsed: current ? String(current.ai_generations_used) : '',
    reason: '',
    confirm: false,
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await correctUserUsage({
        userId,
        month: form.month,
        postsUsed: form.postsUsed,
        aiGenerationsUsed: form.aiGenerationsUsed,
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
        <h3 className="text-sm font-semibold text-brand-navy">
          Huidige maand ({current?.month ?? form.month})
        </h3>
        {!current ? (
          <p className="mt-2 text-sm text-brand-accent">
            Geen usage-rij voor deze maand.
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-brand-navy">
            <li>{usageLine('Posts', current.posts_used, current.posts_limit)}</li>
            <li>
              {usageLine(
                'AI-generaties',
                current.ai_generations_used,
                current.ai_generations_limit,
              )}
            </li>
            <li>
              {usageLine(
                'Platformen',
                current.platforms_used,
                current.platforms_limit,
              )}
            </li>
            <li>
              {usageLine(
                'Teamleden',
                current.team_members_used,
                current.team_members_limit,
              )}
            </li>
          </ul>
        )}
      </section>

      {history.length > 0 ? (
        <section className="rounded-card border border-brand-border bg-brand-white p-5">
          <h3 className="text-sm font-semibold text-brand-navy">Recente maanden</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-brand-accent">
                <tr>
                  <th className="py-1 pr-4">Maand</th>
                  <th className="py-1 pr-4">Posts</th>
                  <th className="py-1">AI</th>
                </tr>
              </thead>
              <tbody className="text-brand-navy">
                {history.map((row) => (
                  <tr key={row.id}>
                    <td className="py-1 pr-4">{row.month}</td>
                    <td className="py-1 pr-4">
                      {row.posts_used} / {row.posts_limit ?? '∞'}
                    </td>
                    <td className="py-1">
                      {row.ai_generations_used} /{' '}
                      {row.ai_generations_limit ?? '∞'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {canMutate ? (
        <form
          onSubmit={onSubmit}
          className="rounded-card border border-amber-200 bg-amber-50/40 p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-brand-navy">
            Verbruik corrigeren (superadmin)
          </h3>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-green-900">{success}</p>
          ) : null}
          <label className="block text-xs text-brand-accent">
            Maand (YYYY-MM)
            <input
              className={field}
              value={form.month}
              onChange={(e) =>
                setForm((f) => ({ ...f, month: e.target.value }))
              }
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-brand-accent">
              posts_used
              <input
                className={field}
                inputMode="numeric"
                value={form.postsUsed}
                onChange={(e) =>
                  setForm((f) => ({ ...f, postsUsed: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs text-brand-accent">
              ai_generations_used
              <input
                className={field}
                inputMode="numeric"
                value={form.aiGenerationsUsed}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    aiGenerationsUsed: e.target.value,
                  }))
                }
              />
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
      ) : (
        <p className="text-sm text-brand-accent">
          Alleen superadmins mogen verbruik corrigeren.
        </p>
      )}
    </div>
  );
}
