'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserCompetitor,
  deactivateUserCompetitor,
  deleteUserCompetitor,
  updateUserCompetitor,
} from '@/lib/user-competitors/actions';
import {
  displayCompetitorName,
  type CompetitorRow,
} from '@/lib/user-competitors/types';

type Props = {
  userId: string;
  rows: CompetitorRow[];
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

const emptyForm = {
  name: '',
  websiteUrl: '',
  industry: '',
  description: '',
  instagramUrl: '',
  facebookUrl: '',
  linkedinUrl: '',
  followers: '',
  engagementRate: '',
};

export function UserCompetitorsPanel({ userId, rows, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, string>>({});

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

  function startEdit(row: CompetitorRow) {
    setEditId(row.id);
    setEditForm({
      name: displayCompetitorName(row),
      websiteUrl: row.website_url ?? '',
      industry: row.industry ?? '',
      description: row.description ?? '',
      instagramUrl: row.instagram_url ?? '',
      facebookUrl: row.facebook_url ?? '',
      linkedinUrl: row.linkedin_url ?? '',
      followers: String(row.followers ?? ''),
      engagementRate: String(row.engagement_rate ?? ''),
    });
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    run(() => createUserCompetitor({ userId, ...createForm }));
  }

  function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editId) return;
    run(() =>
      updateUserCompetitor({ userId, competitorId: editId, ...editForm }),
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {success}
        </div>
      ) : null}

      {canMutate ? (
        <form
          onSubmit={onCreate}
          className="rounded-card border border-brand-border bg-brand-white p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-brand-navy">Concurrent toevoegen</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-brand-accent">
              Naam *
              <input
                required
                className={field}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs text-brand-accent">
              Website
              <input
                className={field}
                value={createForm.websiteUrl}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, websiteUrl: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs text-brand-accent">
              Branche
              <input
                className={field}
                value={createForm.industry}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, industry: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs text-brand-accent">
              Volgers
              <input
                className={field}
                inputMode="numeric"
                value={createForm.followers}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, followers: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="block text-xs text-brand-accent">
            Omschrijving
            <textarea
              rows={2}
              className={field}
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
          >
            Toevoegen
          </button>
        </form>
      ) : null}

      {editId && canMutate ? (
        <form
          onSubmit={onUpdate}
          className="rounded-card border border-brand-accent/40 bg-brand-white p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-brand-navy">Bewerken</h3>
            <button
              type="button"
              className="text-xs text-brand-accent hover:text-brand-navy"
              onClick={() => setEditId(null)}
            >
              Sluiten
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-brand-accent">
              Naam *
              <input
                required
                className={field}
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs text-brand-accent">
              Website
              <input
                className={field}
                value={editForm.websiteUrl}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, websiteUrl: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs text-brand-accent">
              Instagram URL
              <input
                className={field}
                value={editForm.instagramUrl}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, instagramUrl: e.target.value }))
                }
              />
            </label>
            <label className="block text-xs text-brand-accent">
              Engagement %
              <input
                className={field}
                value={editForm.engagementRate}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, engagementRate: e.target.value }))
                }
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
          >
            Opslaan
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-card border border-brand-border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-brand-border bg-brand-cream/40 text-xs uppercase tracking-wide text-brand-accent">
            <tr>
              <th className="px-3 py-2">Naam</th>
              <th className="px-3 py-2">Website</th>
              <th className="px-3 py-2">Volgers</th>
              <th className="px-3 py-2">Engagement</th>
              <th className="px-3 py-2">Status</th>
              {canMutate ? <th className="px-3 py-2">Acties</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {rows.map((row) => (
              <tr key={row.id} className="text-brand-navy">
                <td className="px-3 py-2">{displayCompetitorName(row)}</td>
                <td className="px-3 py-2">
                  {row.website_url ? (
                    <a
                      href={row.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Link
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2">{row.followers ?? '—'}</td>
                <td className="px-3 py-2">{row.engagement_rate ?? '—'}</td>
                <td className="px-3 py-2">{row.analysis_status || '—'}</td>
                {canMutate ? (
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startEdit(row)}
                        className="text-left text-xs font-medium text-brand-navy hover:text-brand-accent"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            deactivateUserCompetitor({
                              userId,
                              competitorId: row.id,
                            }),
                          )
                        }
                        className="text-left text-xs text-brand-accent hover:text-brand-navy"
                      >
                        Deactiveren (soft)
                      </button>
                      <input
                        placeholder={`Typ "${displayCompetitorName(row)}" om te verwijderen`}
                        className="rounded-[8px] border border-brand-border px-2 py-1 text-xs"
                        value={deleteConfirm[row.id] ?? ''}
                        onChange={(e) =>
                          setDeleteConfirm((m) => ({
                            ...m,
                            [row.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            deleteUserCompetitor({
                              userId,
                              competitorId: row.id,
                              confirmName: deleteConfirm[row.id] ?? '',
                            }),
                          )
                        }
                        className="text-left text-xs text-red-700 hover:underline"
                      >
                        Definitief verwijderen
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-brand-accent">
            Geen concurrenten in competitor_data.
          </p>
        ) : null}
      </div>
    </div>
  );
}
