'use client';

import Link from 'next/link';
import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveUserPost,
  createUserPost,
  duplicateUserPost,
  setUserPostStatus,
} from '@/lib/user-posts/actions';
import {
  POST_STATUSES,
  postStatusLabel,
  publishErrors,
  type UserPostRow,
} from '@/lib/user-posts/types';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = {
  userId: string;
  rows: UserPostRow[];
  canMutate: boolean;
  status?: string;
  q?: string;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function UserPostsPanel({
  userId,
  rows,
  canMutate,
  status = 'all',
  q = '',
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    platforms: 'facebook,instagram',
    hashtags: '',
    scheduledFor: '',
    status: 'concept',
    skipReason: '',
  });

  function run(
    action: () => Promise<{ ok: boolean; error?: string; message?: string; id?: string }>,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Actie mislukt.');
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      if (result.id) router.push(`/users/${userId}/posts/${result.id}`);
      router.refresh();
    });
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    run(() =>
      createUserPost({
        userId,
        ...form,
        scheduledFor: form.scheduledFor || undefined,
        skipValidationReason: form.skipReason || undefined,
      }),
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-4 py-3 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <form method="get" className="rounded-card border border-brand-border bg-brand-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-brand-navy">
            Status
            <select name="status" defaultValue={status} className={field}>
              <option value="all">Alle</option>
              {POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {postStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-navy sm:col-span-2">
            Zoeken
            <input name="q" defaultValue={q} className={field} placeholder="Titel, tekst, hashtags…" />
          </label>
        </div>
        <button
          type="submit"
          className="mt-3 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white"
        >
          Filters
        </button>
      </form>

      {canMutate ? (
        <form onSubmit={onCreate} className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
          <h3 className="text-sm font-semibold text-brand-navy">Nieuwe post</h3>
          <p className="text-xs text-brand-accent">
            Actie voor gebruiker <span className="font-mono">{userId}</span>
          </p>
          <label className="block text-xs font-medium text-brand-navy">
            Titel
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Tekst
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={field}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-brand-navy">
              Platforms (komma)
              <input
                value={form.platforms}
                onChange={(e) => setForm((f) => ({ ...f, platforms: e.target.value }))}
                className={field}
              />
            </label>
            <label className="block text-xs font-medium text-brand-navy">
              Gepland (ISO lokaal)
              <input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                className={field}
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-brand-navy">
            Hashtags
            <input
              value={form.hashtags}
              onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Reden om validatie te omzeilen (optioneel, wordt gelogd)
            <input
              value={form.skipReason}
              onChange={(e) => setForm((f) => ({ ...f, skipReason: e.target.value }))}
              className={field}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Post aanmaken
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-card border border-brand-border bg-brand-white">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-accent">Geen posts.</p>
        ) : (
          <ul className="divide-y divide-brand-border">
            {rows.map((row) => {
              const errors = publishErrors(row);
              return (
                <li key={row.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/users/${userId}/posts/${row.id}`}
                        className="text-sm font-medium text-brand-navy hover:text-brand-accent"
                      >
                        {row.title || 'Zonder titel'}
                      </Link>
                      <p className="mt-1 text-xs text-brand-accent">
                        {postStatusLabel(row.status)} ·{' '}
                        {row.platforms?.join(', ') || 'geen platforms'} ·{' '}
                        {row.scheduled_for
                          ? `gepland ${formatSupportDateTime(row.scheduled_for)}`
                          : formatSupportDateTime(row.created_at)}
                      </p>
                      {errors.length > 0 ? (
                        <p className="mt-1 text-xs text-red-700">{errors.join(' · ')}</p>
                      ) : null}
                    </div>
                    {canMutate ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-[8px] border border-brand-border px-2 py-1 text-xs"
                          onClick={() =>
                            run(() =>
                              setUserPostStatus({
                                userId,
                                postId: row.id,
                                status: 'goedgekeurd',
                              }),
                            )
                          }
                        >
                          Goedkeuren
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-[8px] border border-brand-border px-2 py-1 text-xs"
                          onClick={() =>
                            run(() =>
                              setUserPostStatus({
                                userId,
                                postId: row.id,
                                status: 'concept',
                              }),
                            )
                          }
                        >
                          Concept
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-[8px] border border-brand-border px-2 py-1 text-xs"
                          onClick={() =>
                            run(() => duplicateUserPost({ userId, postId: row.id }))
                          }
                        >
                          Dupliceer
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-[8px] border border-brand-border px-2 py-1 text-xs"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Post archiveren voor gebruiker ${userId}?`,
                              )
                            ) {
                              return;
                            }
                            run(() => archiveUserPost({ userId, postId: row.id }));
                          }}
                        >
                          Archiveer
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
