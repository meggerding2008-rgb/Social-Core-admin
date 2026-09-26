'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addHumanConversationMessage } from '@/lib/support/actions';
import type { SupportConversationMessageRow } from '@/lib/support/types';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = {
  conversationId: string;
  ticketId: string;
  messages: SupportConversationMessageRow[];
  canMutate: boolean;
};

function senderLabel(type: SupportConversationMessageRow['sender_type']) {
  switch (type) {
    case 'user':
      return 'Gebruiker';
    case 'core':
      return 'Core AI';
    case 'human':
      return 'Support';
    default:
      return type;
  }
}

export function ConversationThread({
  conversationId,
  ticketId,
  messages,
  canMutate,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addHumanConversationMessage({
        conversationId,
        content,
        ticketId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setContent('');
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-brand-border bg-brand-white p-5">
      <h3 className="text-sm font-semibold text-brand-navy">Gesprek</h3>

      {messages.length === 0 ? (
        <p className="mt-3 text-sm text-brand-accent">Nog geen berichten.</p>
      ) : (
        <ul className="mt-3 max-h-80 space-y-3 overflow-y-auto">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className="rounded-[10px] border border-brand-border bg-brand-mist/60 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-brand-navy">
                  {senderLabel(msg.sender_type)}
                </span>
                <span className="text-xs text-brand-accent">
                  {formatSupportDateTime(msg.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-brand-navy">
                {msg.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canMutate ? (
        <form onSubmit={onSubmit} className="mt-4">
          {error ? (
            <div
              className="mb-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            required
            placeholder="Bericht als support (human)…"
            className="w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent"
          />
          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
          >
            {pending ? 'Bezig…' : 'Bericht plaatsen'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
