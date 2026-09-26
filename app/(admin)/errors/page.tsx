import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canReadErrors,
  ERROR_SEVERITIES,
  ERROR_SOURCES,
  ERROR_STATUSES,
  errorStatusLabel,
  scrubSensitive,
} from '@/lib/errors/types';
import { listErrorReports } from '@/lib/errors/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: { status?: string; severity?: string; source?: string; q?: string };
}) {
  const admin = await requireAdmin();
  if (!canReadErrors(admin.profile.role)) throw new ForbiddenAdminError();

  const { rows, error } = await listErrorReports({
    status: searchParams.status,
    severity: searchParams.severity,
    source: searchParams.source,
    q: searchParams.q,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Foutmeldingen</h1>
        <p className="mt-1 text-sm text-brand-accent">
          Triage van `error_reports`. Clientintegratie vanuit de gebruikersapp ontbreekt nog (zie docs).
        </p>
      </div>

      <form method="get" className="rounded-card border border-brand-border bg-brand-white p-4 grid gap-3 sm:grid-cols-4">
        <select name="status" defaultValue={searchParams.status ?? 'all'} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm">
          <option value="all">Alle statussen</option>
          {ERROR_STATUSES.map((s) => (
            <option key={s} value={s}>{errorStatusLabel(s)}</option>
          ))}
        </select>
        <select name="severity" defaultValue={searchParams.severity ?? 'all'} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm">
          <option value="all">Alle severities</option>
          {ERROR_SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="source" defaultValue={searchParams.source ?? 'all'} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm">
          <option value="all">Alle bronnen</option>
          {ERROR_SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder="Zoeken…" className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <button type="submit" className="sm:col-span-4 w-fit rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm text-white hover:bg-brand-accent">
          Filters
        </button>
      </form>

      {error ? <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {rows.length === 0 ? (
        <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center text-sm text-brand-accent">
          Geen foutmeldingen. De tabel is klaar; de gebruikersapp stuurt hier nog niets naartoe.
        </div>
      ) : (
        <ul className="rounded-card border border-brand-border bg-brand-white divide-y divide-brand-border overflow-hidden">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/errors/${row.id}`} className="block px-4 py-4 hover:bg-brand-mist/70">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-navy">
                      {scrubSensitive(row.message)}
                    </p>
                    <p className="text-xs text-brand-accent">
                      {row.source} · {row.severity} · {row.users?.email || row.user_id || 'geen user'}
                    </p>
                  </div>
                  <div className="text-xs text-brand-accent sm:text-right">
                    <p>{errorStatusLabel(row.status)}</p>
                    <p>{formatSupportDateTime(row.created_at)}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
