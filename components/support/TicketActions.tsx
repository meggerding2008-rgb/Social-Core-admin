'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  replyToSupportMessage,
  updateSupportMessagePriority,
  updateSupportMessageStatus,
} from '@/lib/support/actions';
import {
  SUPPORT_ADMIN_SETTABLE_STATUSES,
  type SupportAdminSettableStatus,
  type SupportMessageRow,
} from '@/lib/support/types';
import { getSupportStatusLabel } from '@/lib/support/labels';

type Props = {
  ticket: SupportMessageRow;
  canMutate: boolean;
};

const fieldClass =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function TicketActions({ ticket, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reply, setReply] = useState(ticket.admin_reply ?? '');
  const [status, setStatus] = useState<SupportAdminSettableStatus>(
    ticket.status === 'gesloten' ? 'opgelost' : 
    (SUPPORT_ADMIN_SETTABLE_STATUSES.includes(
      ticket.status as SupportAdminSettableStatus,
    )
      ? (ticket.status as SupportAdminSettableStatus)
      : 'beantwoord'),
  );
  const [priority, setPriority] = useState(ticket.priority);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!canMutate) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5">
        <p className="text-sm text-brand-accent">
          Je hebt alleen leesrechten op support. Mutaties zijn voorbehouden aan
          support en superadmin.
        </p>
        {ticket.admin_reply ? (
          <div className="mt-4 rounded-[10px] border border-brand-border bg-brand-mist p-3 text-sm text-brand-navy whitespace-pre-wrap">
            {ticket.admin_reply}
          </div>
        ) : null}
      </div>
    );
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, okMessage: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(okMessage);
      router.refresh();
    });
  }

  function onReply(event: FormEvent) {
    event.preventDefault();
    run(
      () =>
        replyToSupportMessage({
          messageId: ticket.id,
          reply,
          status,
        }),
      'Antwoord opgeslagen.',
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <form
        onSubmit={onReply}
        className="rounded-card border border-brand-border bg-brand-white p-5"
      >
        <h2 className="text-sm font-semibold text-brand-navy">Antwoord</h2>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          required
          className={fieldClass}
          placeholder="Typ hier je antwoord aan de gebruiker…"
        />

        <label className="mt-3 block text-xs font-medium text-brand-navy">
          Status na antwoord
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as SupportAdminSettableStatus)
            }
            className={fieldClass}
          >
            {SUPPORT_ADMIN_SETTABLE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {getSupportStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
        >
          {pending ? 'Bezig…' : 'Antwoord opslaan'}
        </button>
      </form>

      <div className="rounded-card border border-brand-border bg-brand-white p-5">
        <h2 className="text-sm font-semibold text-brand-navy">Snelle acties</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1 text-xs font-medium text-brand-navy">
            Status
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as SupportAdminSettableStatus)
              }
              className={fieldClass}
            >
              {SUPPORT_ADMIN_SETTABLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {getSupportStatusLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  updateSupportMessageStatus({
                    messageId: ticket.id,
                    status,
                  }),
                'Status bijgewerkt.',
              )
            }
            className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist disabled:opacity-60"
          >
            Status opslaan
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              checked={priority}
              onChange={(e) => setPriority(e.target.checked)}
              className="h-4 w-4 accent-brand-navy"
            />
            Prioriteit
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  updateSupportMessagePriority({
                    messageId: ticket.id,
                    priority,
                  }),
                'Prioriteit bijgewerkt.',
              )
            }
            className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist disabled:opacity-60"
          >
            Prioriteit opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
