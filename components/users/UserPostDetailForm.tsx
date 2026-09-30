'use client';

import Link from 'next/link';
import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  archiveUserPost,
  clearPostPublishErrors,
  duplicateUserPost,
  setUserPostStatus,
  updateUserPost,
} from '@/lib/user-posts/actions';
import {
  POST_STATUSES,
  postStatusLabel,
  publishErrors,
  type UserPostRow,
} from '@/lib/user-posts/types';

type Props = {
  userId: string;
  post: UserPostRow;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function UserPostDetailForm({ userId, post, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: post.title ?? '',
    description: post.description ?? '',
    platforms: (post.platforms ?? []).join(','),
    hashtags: post.hashtags ?? '',
    scheduledFor: toLocalInput(post.scheduled_for),
    status: post.status ?? 'concept',
    imageUrl: post.image_url ?? '',
    skipReason: '',
  });

  const errors = publishErrors(post);

  function run(
    action: () => Promise<{ ok: boolean; error?: string; message?: string; id?: string }>,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Mislukt.');
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      if (result.id) router.push(`/users/${userId}/posts/${result.id}`);
      router.refresh();
    });
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    run(() =>
      updateUserPost({
        userId,
        postId: post.id,
        title: form.title,
        description: form.description,
        platforms: form.platforms,
        hashtags: form.hashtags,
        scheduledFor: form.scheduledFor || null,
        status: form.status,
        imageUrl: form.imageUrl,
        skipValidationReason: form.skipReason || undefined,
      }),
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/users/${userId}/posts`}
        className="text-sm font-medium text-brand-accent hover:text-brand-navy"
      >
        ← Posts
      </Link>

      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-4 py-3 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-medium">Publicatiefouten</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {canMutate ? (
            <button
              type="button"
              disabled={pending}
              className="mt-2 text-xs font-medium underline"
              onClick={() =>
                run(() =>
                  clearPostPublishErrors({ userId, postId: post.id }),
                )
              }
            >
              Fouten wissen
            </button>
          ) : null}
        </div>
      ) : null}

      {!canMutate ? (
        <div className="rounded-card border border-brand-border bg-brand-white p-5 text-sm text-brand-accent">
          Alleen-lezen. Status: {postStatusLabel(post.status)}
        </div>
      ) : (
        <form onSubmit={onSave} className="space-y-3 rounded-card border border-brand-border bg-brand-white p-5">
          <p className="text-xs text-brand-accent">
            Post <span className="font-mono">{post.id}</span> · gebruiker{' '}
            <span className="font-mono">{userId}</span>
          </p>
          <label className="block text-xs font-medium text-brand-navy">
            Titel
            <input
              className={field}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Tekst
            <textarea
              rows={6}
              className={field}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-brand-navy">
              Platforms
              <input
                className={field}
                value={form.platforms}
                onChange={(e) =>
                  setForm((f) => ({ ...f, platforms: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-brand-navy">
              Status
              <select
                className={field}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                {POST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {postStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-brand-navy">
              Gepland
              <input
                type="datetime-local"
                className={field}
                value={form.scheduledFor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduledFor: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs font-medium text-brand-navy">
              Afbeelding-URL
              <input
                className={field}
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-brand-navy">
            Hashtags
            <input
              className={field}
              value={form.hashtags}
              onChange={(e) =>
                setForm((f) => ({ ...f, hashtags: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Reden validatie-omzeiling (optioneel)
            <input
              className={field}
              value={form.skipReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, skipReason: e.target.value }))
              }
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Opslaan
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-[10px] border border-brand-border px-4 py-2 text-sm"
              onClick={() =>
                run(() =>
                  setUserPostStatus({
                    userId,
                    postId: post.id,
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
              className="rounded-[10px] border border-brand-border px-4 py-2 text-sm"
              onClick={() =>
                run(() => duplicateUserPost({ userId, postId: post.id }))
              }
            >
              Dupliceer
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-[10px] border border-brand-border px-4 py-2 text-sm"
              onClick={() => {
                if (!window.confirm('Post archiveren?')) return;
                run(() => archiveUserPost({ userId, postId: post.id }));
              }}
            >
              Archiveer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
