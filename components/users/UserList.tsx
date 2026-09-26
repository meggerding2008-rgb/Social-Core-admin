import Link from 'next/link';
import type { UserListRow } from '@/lib/users/types';
import {
  planLabel,
  subscriptionStatusLabel,
} from '@/lib/users/types';
import { AccountStatusBadge } from '@/components/users/AccountStatusBadge';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = {
  rows: UserListRow[];
};

export function UserList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center">
        <p className="text-sm font-medium text-brand-navy">
          Geen gebruikers gevonden
        </p>
        <p className="mt-1 text-sm text-brand-accent">
          Pas de filters aan of controleer of de fase-3 migratie is uitgevoerd.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-brand-border bg-brand-white">
      <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_1fr_auto_auto] gap-3 border-b border-brand-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-accent lg:grid">
        <span>Naam</span>
        <span>E-mail</span>
        <span>Bedrijf</span>
        <span>Abonnement</span>
        <span>Status</span>
        <span>Registratie</span>
      </div>

      <ul className="divide-y divide-brand-border">
        {rows.map((row) => {
          const plan = planLabel(
            row.subscription?.tier ?? row.subscription_tier,
          );
          const subStatus = subscriptionStatusLabel(row.subscription?.status);

          return (
            <li key={row.id}>
              <Link
                href={`/users/${row.id}`}
                className="block px-4 py-4 transition hover:bg-brand-mist/70"
              >
                <div className="grid gap-2 lg:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto_auto] lg:items-center lg:gap-3">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    {row.name?.trim() || '—'}
                  </p>
                  <p className="truncate text-sm text-brand-navy">
                    {row.email || '—'}
                  </p>
                  <p className="truncate text-sm text-brand-navy">
                    {row.company?.trim() || '—'}
                  </p>
                  <div className="min-w-0">
                    <p className="text-sm text-brand-navy">{plan}</p>
                    <p className="text-xs text-brand-accent">{subStatus}</p>
                  </div>
                  <AccountStatusBadge status={row.account_status} />
                  <p className="text-xs text-brand-accent lg:text-right">
                    {row.created_at
                      ? formatSupportDateTime(row.created_at)
                      : '—'}
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
