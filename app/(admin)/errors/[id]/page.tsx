import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canMutateErrors,
  canReadErrors,
  canViewStack,
  errorStatusLabel,
  scrubSensitive,
} from '@/lib/errors/types';
import {
  getErrorReportById,
  listAdminAssignees,
} from '@/lib/errors/queries';
import { ErrorActions } from '@/components/errors/ErrorActions';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function ErrorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canReadErrors(admin.profile.role)) throw new ForbiddenAdminError();

  const [{ row, error }, assignees] = await Promise.all([
    getErrorReportById(params.id),
    listAdminAssignees(),
  ]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        <Link href="/errors" className="text-sm text-brand-navy">← Terug</Link>
      </div>
    );
  }
  if (!row) notFound();

  const showStack = canViewStack(admin.profile.role);
  const notes = Array.isArray(row.context?.internal_notes)
    ? (row.context.internal_notes as { at?: string; note?: string }[])
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/errors" className="text-sm text-brand-accent hover:text-brand-navy">
        ← Foutmeldingen
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Foutmelding</h1>
        <p className="mt-1 text-sm text-brand-accent">
          {errorStatusLabel(row.status)} · {row.severity} · {row.source} ·{' '}
          {formatSupportDateTime(row.created_at)}
        </p>
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
        <p className="whitespace-pre-wrap text-sm text-brand-navy">
          {scrubSensitive(row.message)}
        </p>
        {row.url ? <p className="text-xs text-brand-accent">URL: {scrubSensitive(row.url)}</p> : null}
        {row.user_id ? (
          <p className="text-sm">
            Gebruiker:{' '}
            <Link href={`/users/${row.user_id}`} className="font-medium text-brand-navy hover:text-brand-accent">
              {row.users?.email || row.user_id}
            </Link>
            {' · '}
            <Link href={`/support?q=${encodeURIComponent(row.users?.email || '')}`} className="text-brand-accent">
              Support zoeken
            </Link>
          </p>
        ) : null}
        {showStack && row.stack ? (
          <pre className="mt-3 overflow-x-auto rounded-[10px] border border-brand-border bg-brand-mist p-3 text-xs text-brand-navy whitespace-pre-wrap">
            {scrubSensitive(row.stack)}
          </pre>
        ) : null}
        {!showStack ? (
          <p className="text-xs text-brand-accent">Stacktrace alleen zichtbaar voor support/superadmin.</p>
        ) : null}
        {notes.length > 0 ? (
          <div className="border-t border-brand-border pt-3">
            <p className="text-xs font-semibold uppercase text-brand-accent">Interne notities</p>
            <ul className="mt-2 space-y-2">
              {notes.map((n, i) => (
                <li key={i} className="text-sm text-brand-navy">
                  <span className="text-xs text-brand-accent">{n.at ? formatSupportDateTime(n.at) : ''}</span>
                  <p className="whitespace-pre-wrap">{n.note}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <ErrorActions
        report={row}
        canMutate={canMutateErrors(admin.profile.role)}
        assignees={assignees}
      />
    </div>
  );
}
