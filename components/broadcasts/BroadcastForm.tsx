'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createBroadcast,
  updateBroadcast,
  requestBroadcastDispatch,
} from '@/lib/broadcasts/actions';
import type { BroadcastRow } from '@/lib/broadcasts/types';

type Props = {
  mode: 'create' | 'edit';
  initial?: BroadcastRow;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function BroadcastForm({ mode, initial, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [message, setMessage] = useState(initial?.message ?? '');
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? '');
  const [linkLabel, setLinkLabel] = useState(initial?.link_label ?? 'Lees artikel');
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduledFor, setScheduledFor] = useState(
    initial?.scheduled_for
      ? initial.scheduled_for.slice(0, 16)
      : '',
  );

  const locked = Boolean(initial?.dispatched_at);

  if (!canMutate) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5 text-sm text-brand-accent">
        Alleen lezen.
      </div>
    );
  }

  if (locked) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5 text-sm text-brand-accent">
        Deze broadcast is al verzonden en kan niet meer worden bewerkt.
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createBroadcast({
              title,
              message,
              linkUrl,
              linkLabel,
              sendMode,
              scheduledFor:
                sendMode === 'schedule'
                  ? new Date(scheduledFor).toISOString()
                  : undefined,
            })
          : await updateBroadcast({
              id: initial!.id,
              title,
              message,
              linkUrl,
              linkLabel,
              scheduledFor: new Date(
                scheduledFor || initial!.scheduled_for,
              ).toISOString(),
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      if (mode === 'create' && result.id) router.replace(`/broadcasts/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <div className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
        <p className="text-xs text-brand-accent">
          Doelgroep: alle gebruikers (bestaande dispatcher). Geen tweede
          verzendmechanisme.
        </p>
        <label className="block text-xs font-medium text-brand-navy">
          Titel
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className={field} />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Bericht
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} className={field} />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Link-URL (optioneel)
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={field} />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Link-label
          <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className={field} />
        </label>

        {mode === 'create' ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-brand-navy">
              <input type="radio" checked={sendMode === 'now'} onChange={() => setSendMode('now')} />
              Direct plannen (nu) + dispatcher aanroepen indien geconfigureerd
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-navy">
              <input type="radio" checked={sendMode === 'schedule'} onChange={() => setSendMode('schedule')} />
              Later plannen
            </label>
            {sendMode === 'schedule' ? (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                required
                className={field}
              />
            ) : null}
          </div>
        ) : (
          <label className="block text-xs font-medium text-brand-navy">
            Gepland voor
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              required
              className={field}
            />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-accent disabled:opacity-60"
        >
          {pending ? 'Bezig…' : mode === 'create' ? 'Broadcast aanmaken' : 'Opslaan'}
        </button>
        {mode === 'edit' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await requestBroadcastDispatch();
                if (!result.ok) setError(result.error);
                else {
                  setSuccess(result.message ?? 'OK');
                  router.refresh();
                }
              })
            }
            className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-mist disabled:opacity-60"
          >
            Dispatcher nu aanroepen
          </button>
        ) : null}
      </div>
    </form>
  );
}
