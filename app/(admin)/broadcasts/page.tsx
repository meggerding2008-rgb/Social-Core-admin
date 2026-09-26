import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  broadcastStatus,
  broadcastStatusLabel,
  canMutateBroadcasts,
  canReadBroadcasts,
} from '@/lib/broadcasts/types';
import { listBroadcasts } from '@/lib/broadcasts/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function BroadcastsPage({
  searchParams,
}: {
  searchParams: { status?: string; from?: string; to?: string; q?: string };
}) {
  const admin = await requireAdmin();
  if (!canReadBroadcasts(admin.profile.role)) throw new ForbiddenAdminError();

  const status = searchParams.status ?? 'all';
  const { rows, error } = await listBroadcasts({
    status: status === 'all' ? undefined : status,
    from: searchParams.from,
    to: searchParams.to,
    q: searchParams.q,
  });
  const canMutate = canMutateBroadcasts(admin.profile.role);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Broadcasts</h1>
          <p className="mt-1 text-sm text-brand-accent">
            Aanmaken hier; verzenden via de bestaande gebruikersapp-dispatcher.
          </p>
        </div>
        {canMutate ? (
          <Link
            href="/broadcasts/new"
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-accent"
          >
            Nieuwe broadcast
          </Link>
        ) : null}
      </div>

      <form method="get" className="rounded-card border border-brand-border bg-brand-white p-4 grid gap-3 sm:grid-cols-4">
        <select name="status" defaultValue={status} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm">
          <option value="all">Alle statussen</option>
          <option value="pending">Open / gepland</option>
          <option value="sent">Verzonden</option>
        </select>
        <input type="date" name="from" defaultValue={searchParams.from ?? ''} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <input type="date" name="to" defaultValue={searchParams.to ?? ''} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <input type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder="Zoeken…" className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <button type="submit" className="sm:col-span-4 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm text-white hover:bg-brand-accent w-fit">
          Filters
        </button>
      </form>

      {error ? <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {rows.length === 0 ? (
        <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center text-sm text-brand-accent">
          Geen broadcasts.
        </div>
      ) : (
        <ul className="rounded-card border border-brand-border bg-brand-white divide-y divide-brand-border overflow-hidden">
          {rows.map((row) => {
            const st = broadcastStatus(row);
            return (
              <li key={row.id}>
                <Link href={`/broadcasts/${row.id}`} className="block px-4 py-4 hover:bg-brand-mist/70">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-brand-navy">{row.title}</p>
                      <p className="text-xs text-brand-accent line-clamp-1">{row.message}</p>
                    </div>
                    <div className="text-xs text-brand-accent sm:text-right">
                      <p>{broadcastStatusLabel(st)}</p>
                      <p>{formatSupportDateTime(row.scheduled_for)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
