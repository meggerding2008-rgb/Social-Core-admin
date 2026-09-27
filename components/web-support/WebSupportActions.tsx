'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  assignWebsiteMessage,
  convertWebsiteMessageToAppTicket,
  replyToWebsiteMessage,
  updateWebsiteMessageStatus,
} from '@/lib/web-support/actions';
import {
  WEBSITE_MESSAGE_STATUSES,
  websiteMessageStatusLabel,
  type WebsiteMessageRow,
  type WebsiteMessageStatus,
} from '@/lib/web-support/types';

type Props = {
  message: WebsiteMessageRow;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function WebSupportActions({ message, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<WebsiteMessageStatus>(message.status);

  if (!canMutate) {
    return (
      <p className="text-sm text-brand-accent">
        Alleen-lezen: je hebt geen rechten om web support te bewerken.
      </p>
    );
  }

  function run(
    action: () => Promise<{ ok: boolean; error?: string; id?: string; message?: string }>,
    onOk?: (result: { id?: string; message?: string }) => void,
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
      onOk?.(result);
      router.refresh();
    });
  }

  function onStatus(event: FormEvent) {
    event.preventDefault();
    run(() =>
      updateWebsiteMessageStatus({
        messageId: message.id,
        status,
      }),
    );
  }

  function onReply(event: FormEvent) {
    event.preventDefault();
    run(() =>
      replyToWebsiteMessage({
        messageId: message.id,
        note,
        status: 'beantwoord',
      }),
    );
  }

  return (
    <div className="space-y-4 rounded-card border border-brand-border bg-brand-white p-5">
      {error ? (
        <div
          className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-4 py-3 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => assignWebsiteMessage({ messageId: message.id }))
          }
          className="rounded-[10px] border border-brand-border px-3 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist disabled:opacity-60"
        >
          Aan mij toewijzen
        </button>
        <button
          type="button"
          disabled={pending || Boolean(message.support_ticket_id)}
          onClick={() =>
            run(
              () =>
                convertWebsiteMessageToAppTicket({ messageId: message.id }),
              (result) => {
                if (result.id) {
                  router.push(`/app-support/${result.id}`);
                }
              },
            )
          }
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-3 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
        >
          {message.support_ticket_id
            ? 'Al omgezet naar app-ticket'
            : 'Omzetten naar App support'}
        </button>
        {message.support_ticket_id ? (
          <a
            href={`/app-support/${message.support_ticket_id}`}
            className="rounded-[10px] border border-brand-border px-3 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist"
          >
            Open app-ticket
          </a>
        ) : null}
      </div>

      <form onSubmit={onStatus} className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-medium text-brand-navy">
          Status
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as WebsiteMessageStatus)
            }
            className={field}
          >
            {WEBSITE_MESSAGE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {websiteMessageStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist disabled:opacity-60"
        >
          Status opslaan
        </button>
      </form>

      <form onSubmit={onReply} className="space-y-2">
        <label className="block text-xs font-medium text-brand-navy">
          Interne notitie / antwoord (geen e-mail)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className={field}
            placeholder="Noteer hoe dit bericht is afgehandeld…"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
        >
          Markeer als beantwoord
        </button>
      </form>
    </div>
  );
}
