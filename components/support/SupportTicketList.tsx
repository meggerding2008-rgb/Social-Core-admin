import Link from 'next/link';
import {
  supportSourceLabel,
  type SupportMessageRow,
} from '@/lib/support/types';
import {
  formatSupportDateTime,
  truncateText,
} from '@/lib/support/labels';
import { PriorityBadge, StatusBadge } from '@/components/support/StatusBadge';

type Props = {
  rows: SupportMessageRow[];
  basePath?: string;
};

export function SupportTicketList({
  rows,
  basePath = '/app-support',
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center">
        <p className="text-sm font-medium text-brand-navy">
          Geen supportvragen gevonden
        </p>
        <p className="mt-1 text-sm text-brand-accent">
          Pas de filters aan of stuur zelf een bericht naar een gebruiker.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-brand-border bg-brand-white">
      <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto_auto_auto_auto] gap-3 border-b border-brand-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-accent lg:grid">
        <span>Gebruiker</span>
        <span>Onderwerp / bericht</span>
        <span>Bron</span>
        <span>Prioriteit</span>
        <span>Status</span>
        <span>Datum</span>
      </div>

      <ul className="divide-y divide-brand-border">
        {rows.map((row) => {
          const userLabel =
            row.users?.name ||
            row.users?.email ||
            row.user_id.slice(0, 8);
          const sourceLabel = supportSourceLabel(row.source);

          return (
            <li key={row.id}>
              <Link
                href={`${basePath}/${row.id}`}
                className="block px-4 py-4 transition hover:bg-brand-mist/70"
              >
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto_auto_auto_auto] lg:items-center lg:gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-navy">
                      {userLabel}
                    </p>
                    {row.users?.email && row.users?.name ? (
                      <p className="truncate text-xs text-brand-accent">
                        {row.users.email}
                      </p>
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-navy">
                      {row.subject?.trim() || 'Geen onderwerp'}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-brand-accent lg:line-clamp-1">
                      {truncateText(row.message, 140)}
                    </p>
                    <p className="mt-1 text-xs text-brand-accent lg:hidden">
                      Bron: {sourceLabel}
                    </p>
                  </div>

                  <span className="hidden rounded-[8px] border border-brand-border px-2 py-0.5 text-xs text-brand-navy lg:inline-flex">
                    {sourceLabel}
                  </span>

                  <div>
                    <PriorityBadge priority={row.priority} />
                  </div>

                  <div>
                    <StatusBadge status={row.status} />
                  </div>

                  <p className="text-xs text-brand-accent lg:text-right">
                    {formatSupportDateTime(row.created_at)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
