'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveMedia, restoreMedia } from '@/lib/user-library/actions';
import {
  mediaStatusLabel,
  MEDIA_ARCHIVED_STATUS,
  type MediaAssetRow,
} from '@/lib/user-library/types';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = {
  userId: string;
  rows: MediaAssetRow[];
  canMutate: boolean;
  includeArchived: boolean;
  q?: string;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

function formatBytes(n: number | null): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function UserLibraryPanel({
  userId,
  rows,
  canMutate,
  includeArchived,
  q = '',
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState(q);

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Actie mislukt.');
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      router.refresh();
    });
  }

  function onFilter(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (includeArchived) params.set('archived', '1');
    if (search.trim()) params.set('q', search.trim());
    router.push(`/users/${userId}/library?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
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

      <form
        onSubmit={onFilter}
        className="flex flex-wrap items-end gap-3 rounded-card border border-brand-border bg-brand-white p-4"
      >
        <label className="block text-xs font-medium text-brand-navy">
          Zoeken
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={field}
            placeholder="Platform, type, pad…"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-xs text-brand-navy">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={() => {
              const params = new URLSearchParams();
              if (!includeArchived) params.set('archived', '1');
              if (search.trim()) params.set('q', search.trim());
              router.push(`/users/${userId}/library?${params.toString()}`);
            }}
          />
          Toon gearchiveerd
        </label>
        <button
          type="submit"
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm text-brand-navy hover:bg-brand-mist"
        >
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-brand-accent">Geen media in bibliotheek.</p>
      ) : (
        <ul className="divide-y divide-brand-border rounded-card border border-brand-border bg-brand-white">
          {rows.map((row) => {
            const archived = row.variant_status === MEDIA_ARCHIVED_STATUS;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brand-navy">
                    {row.platform || row.source_type || 'Media'}{' '}
                    <span className="font-normal text-brand-accent">
                      · {mediaStatusLabel(row.variant_status)}
                    </span>
                  </p>
                  <p className="mt-1 truncate text-xs text-brand-accent">
                    {row.mime_type || '—'} · {formatBytes(row.file_size_bytes)}
                    {row.width && row.height
                      ? ` · ${row.width}×${row.height}`
                      : ''}
                  </p>
                  <p className="mt-1 text-xs text-brand-accent">
                    {formatSupportDateTime(row.created_at)}
                    {row.post_id ? ` · post ${row.post_id.slice(0, 8)}…` : ''}
                  </p>
                  {row.public_url ? (
                    <a
                      href={row.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-brand-navy hover:text-brand-accent"
                    >
                      Open URL →
                    </a>
                  ) : null}
                </div>
                {canMutate ? (
                  <div className="flex shrink-0 gap-2">
                    {archived ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            restoreMedia({ userId, mediaId: row.id }),
                          )
                        }
                        className="rounded-[10px] border border-brand-navy px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-brand-mist disabled:opacity-60"
                      >
                        Herstellen
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            archiveMedia({ userId, mediaId: row.id }),
                          )
                        }
                        className="rounded-[10px] border border-red-700 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-50 disabled:opacity-60"
                      >
                        Archiveren
                      </button>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
