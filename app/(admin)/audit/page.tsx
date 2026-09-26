import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { listAuditLogs } from '@/lib/admins/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '"[unserializable]"';
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: {
    actorId?: string;
    action?: string;
    resourceType?: string;
    from?: string;
    to?: string;
    q?: string;
  };
}) {
  const admin = await requireAdmin();
  // All admins can read audit; only mutations are restricted elsewhere
  if (!admin) throw new ForbiddenAdminError();

  const { rows, error } = await listAuditLogs({
    actorId: searchParams.actorId,
    action: searchParams.action,
    resourceType: searchParams.resourceType,
    from: searchParams.from,
    to: searchParams.to,
    q: searchParams.q,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Auditlogs</h1>
        <p className="mt-1 text-sm text-brand-accent">
          Alleen-lezen. Logs kunnen niet worden gewijzigd of verwijderd.
        </p>
      </div>

      <form method="get" className="rounded-card border border-brand-border bg-brand-white p-4 grid gap-3 sm:grid-cols-3">
        <input name="action" defaultValue={searchParams.action ?? ''} placeholder="Actie" className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <input name="resourceType" defaultValue={searchParams.resourceType ?? ''} placeholder="Resource type" className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder="Zoeken…" className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <input type="date" name="from" defaultValue={searchParams.from ?? ''} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <input type="date" name="to" defaultValue={searchParams.to ?? ''} className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <input name="actorId" defaultValue={searchParams.actorId ?? ''} placeholder="Actor user id" className="rounded-[10px] border border-brand-border px-3 py-2 text-sm" />
        <button type="submit" className="sm:col-span-3 w-fit rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm text-white hover:bg-brand-accent">
          Filters
        </button>
      </form>

      {error ? <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      {rows.length === 0 ? (
        <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center text-sm text-brand-accent">
          Geen auditregels.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-card border border-brand-border bg-brand-white p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-navy">{row.action}</p>
                  <p className="text-xs text-brand-accent">
                    {row.resource_type}
                    {row.resource_id ? ` · ${row.resource_id}` : ''} · actor{' '}
                    {row.actor_id.slice(0, 8)}…
                  </p>
                </div>
                <p className="text-xs text-brand-accent">
                  {formatSupportDateTime(row.created_at)}
                </p>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-brand-accent">
                  Before / after
                </summary>
                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  <pre className="overflow-x-auto rounded-[10px] border border-brand-border bg-brand-mist p-2 text-[11px] text-brand-navy">
                    {safeJson(row.before_state)}
                  </pre>
                  <pre className="overflow-x-auto rounded-[10px] border border-brand-border bg-brand-mist p-2 text-[11px] text-brand-navy">
                    {safeJson(row.after_state)}
                  </pre>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      {admin.profile.role === 'superadmin' ? (
        <p className="text-sm">
          <Link href="/admins" className="font-medium text-brand-navy hover:text-brand-accent">
            Adminbeheer →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
