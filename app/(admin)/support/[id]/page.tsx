import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canMutateSupport,
  canReadSupport,
} from '@/lib/support/types';
import {
  getSupportMessageById,
  listConversationMessages,
  listHumanConversationsForUser,
} from '@/lib/support/queries';
import { formatSupportDateTime } from '@/lib/support/labels';
import { PriorityBadge, StatusBadge } from '@/components/support/StatusBadge';
import { TicketActions } from '@/components/support/TicketActions';
import { ConversationThread } from '@/components/support/ConversationThread';

export const dynamic = 'force-dynamic';

export default async function SupportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canReadSupport(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { row: ticket, error } = await getSupportMessageById(params.id);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
        <Link
          href="/support"
          className="mt-4 inline-block text-sm font-medium text-brand-navy hover:text-brand-accent"
        >
          ← Terug naar support
        </Link>
      </div>
    );
  }

  if (!ticket) {
    notFound();
  }

  const canMutate = canMutateSupport(admin.profile.role);
  const { rows: conversations, error: conversationsError } =
    await listHumanConversationsForUser(ticket.user_id);

  const conversationsWithMessages = await Promise.all(
    conversations.map(async (conversation) => {
      const { rows: messages } = await listConversationMessages(conversation.id);
      return { conversation, messages };
    }),
  );

  const userLabel =
    ticket.users?.name || ticket.users?.email || ticket.user_id;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link
          href="/support?status=open"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← Terug naar support
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy">
          {ticket.subject?.trim() || 'Supportvraag'}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="text-xs text-brand-accent">
            {formatSupportDateTime(ticket.created_at)}
          </span>
        </div>
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              Gebruiker
            </dt>
            <dd className="mt-1 text-sm text-brand-navy">{userLabel}</dd>
            {ticket.users?.email && ticket.users?.name ? (
              <dd className="text-xs text-brand-accent">{ticket.users.email}</dd>
            ) : null}
            {ticket.users?.company ? (
              <dd className="text-xs text-brand-accent">
                {ticket.users.company}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              Categorie
            </dt>
            <dd className="mt-1 text-sm text-brand-navy">
              {ticket.category || '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-brand-border pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
            Bericht
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy">
            {ticket.message}
          </p>
        </div>

        {ticket.admin_reply ? (
          <div className="mt-5 border-t border-brand-border pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              Huidig adminantwoord
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy">
              {ticket.admin_reply}
            </p>
          </div>
        ) : null}
      </section>

      <TicketActions ticket={ticket} canMutate={canMutate} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-brand-navy">
          Menselijke gesprekken
        </h2>
        {conversationsError ? (
          <div
            className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {conversationsError}
          </div>
        ) : null}

        {conversationsWithMessages.length === 0 ? (
          <div className="rounded-card border border-brand-border bg-brand-white px-5 py-8 text-center">
            <p className="text-sm text-brand-accent">
              Geen menselijke chatgesprekken voor deze gebruiker.
            </p>
          </div>
        ) : (
          conversationsWithMessages.map(({ conversation, messages }) => (
            <div key={conversation.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 px-1">
                <p className="text-sm font-medium text-brand-navy">
                  {conversation.title || 'Supportgesprek'}
                </p>
                <span className="text-xs text-brand-accent">
                  {conversation.status === 'open' ? 'Open' : 'Gesloten'}
                </span>
              </div>
              <ConversationThread
                conversationId={conversation.id}
                ticketId={ticket.id}
                messages={messages}
                canMutate={canMutate}
              />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
