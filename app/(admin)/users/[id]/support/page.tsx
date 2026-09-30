import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManageSupport, canViewSupport } from '@/lib/auth/permissions';
import { isSupportMessageStatus } from '@/lib/support/types';
import { formatSupportDateTime } from '@/lib/support/labels';
import { StatusBadge } from '@/components/support/StatusBadge';
import { getUserProfile, listRecentSupportForUser } from '@/lib/users/queries';
import { listWebsiteMessagesForUser } from '@/lib/web-support/queries';
import { websiteMessageStatusLabel } from '@/lib/web-support/types';

export const dynamic = 'force-dynamic';

export default async function UserSupportPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewSupport(admin.profile.role)) throw new ForbiddenAdminError();

  const { row: user } = await getUserProfile(params.id);
  if (!user) notFound();

  const [ticketsResult, websiteResult] = await Promise.all([
    listRecentSupportForUser(user.id, 100),
    listWebsiteMessagesForUser({
      userId: user.id,
      email: user.email,
      limit: 100,
    }),
  ]);

  const canContact = canManageSupport(admin.profile.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Support</h2>
          <p className="text-sm text-brand-accent">
            App-supporttickets en websiteberichten voor deze gebruiker.
          </p>
        </div>
        {canContact ? (
          <Link
            href={`/app-support/new?userId=${user.id}`}
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent"
          >
            Nieuw bericht aan gebruiker
          </Link>
        ) : null}
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <h3 className="text-sm font-semibold text-brand-navy">
          App-support (`support_messages`)
        </h3>
        {ticketsResult.error ? (
          <p className="mt-2 text-sm text-red-700">{ticketsResult.error}</p>
        ) : ticketsResult.rows.length === 0 ? (
          <p className="mt-2 text-sm text-brand-accent">Geen tickets.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-border">
            {ticketsResult.rows.map((ticket) => (
              <li key={ticket.id} className="py-2">
                <Link
                  href={`/app-support/${ticket.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 hover:text-brand-accent"
                >
                  <span className="text-sm text-brand-navy">
                    {ticket.subject || 'Zonder onderwerp'}
                  </span>
                  <span className="flex items-center gap-2">
                    {isSupportMessageStatus(ticket.status) ? (
                      <StatusBadge status={ticket.status} />
                    ) : (
                      <span className="text-xs text-brand-accent">
                        {ticket.status}
                      </span>
                    )}
                    <span className="text-xs text-brand-accent">
                      {formatSupportDateTime(ticket.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Websiteberichten
          </h3>
          <Link
            href="/web-support"
            className="text-xs font-medium text-brand-navy hover:text-brand-accent"
          >
            Alle website-support →
          </Link>
        </div>
        {websiteResult.error ? (
          <p className="mt-2 text-sm text-red-700">{websiteResult.error}</p>
        ) : websiteResult.rows.length === 0 ? (
          <p className="mt-2 text-sm text-brand-accent">
            Geen berichten op user_id of e-mail.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-border">
            {websiteResult.rows.map((msg) => (
              <li key={msg.id} className="py-2">
                <Link
                  href={`/web-support/${msg.id}`}
                  className="block hover:text-brand-accent"
                >
                  <p className="text-sm text-brand-navy">
                    {msg.subject || msg.sender_name}
                  </p>
                  <p className="text-xs text-brand-accent">
                    {websiteMessageStatusLabel(msg.status)} ·{' '}
                    {formatSupportDateTime(msg.created_at)} · {msg.sender_email}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
