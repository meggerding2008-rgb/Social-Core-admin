import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canMutatePopups,
  canReadPopups,
  popupAudienceLabel,
  popupDisplayStyleLabel,
  popupPersistLabel,
  popupStatusLabel,
  popupTypeLabel,
} from '@/lib/popups/types';
import { getPopupById } from '@/lib/popups/queries';
import { PopupForm } from '@/components/popups/PopupForm';
import { formatSupportDateTime } from '@/lib/support/labels';
import { planLabel } from '@/lib/users/types';

export const dynamic = 'force-dynamic';

export default async function PopupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canReadPopups(admin.profile.role)) throw new ForbiddenAdminError();

  const { row, responses, dismissalCount, error } = await getPopupById(
    params.id,
  );

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
        <Link href="/popups" className="text-sm text-brand-navy">
          ← Terug
        </Link>
      </div>
    );
  }
  if (!row) notFound();

  const canMutate = canMutatePopups(admin.profile.role);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/popups"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← Pop-ups
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy">
          {row.title}
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          {popupStatusLabel(row.status)} · {popupTypeLabel(row.type)} ·{' '}
          {popupDisplayStyleLabel(row.display_style)}
        </p>
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs uppercase text-brand-accent">Doelgroep</dt>
            <dd className="text-brand-navy">
              {popupAudienceLabel(row.audience)}
              {row.audience_filter.tier
                ? ` · ${planLabel(row.audience_filter.tier)}`
                : ''}
              {row.audience_filter.feature
                ? ` · ${row.audience_filter.feature}`
                : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-brand-accent">Herhaalregel</dt>
            <dd className="text-brand-navy">
              {popupPersistLabel(row.persist_until)}
              {row.show_after_days != null
                ? ` · na ${row.show_after_days} dagen`
                : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-brand-accent">Start</dt>
            <dd className="text-brand-navy">
              {row.start_at ? formatSupportDateTime(row.start_at) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-brand-accent">Einde</dt>
            <dd className="text-brand-navy">
              {row.end_at ? formatSupportDateTime(row.end_at) : 'Geen einddatum'}
            </dd>
          </div>
        </dl>
        <div className="border-t border-brand-border pt-3">
          <p className="whitespace-pre-wrap text-sm text-brand-navy">{row.body}</p>
        </div>
        <p className="text-xs text-brand-accent">
          Reacties: {responses.length} · Afgewezen: {dismissalCount}
        </p>
      </section>

      {(row.type === 'feedback' || row.type === 'survey') && (
        <section className="rounded-card border border-brand-border bg-brand-white p-5">
          <h2 className="text-sm font-semibold text-brand-navy">Resultaten</h2>
          {responses.length === 0 ? (
            <p className="mt-2 text-sm text-brand-accent">Nog geen reacties.</p>
          ) : (
            <ul className="mt-3 divide-y divide-brand-border">
              {responses.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="text-sm text-brand-navy">
                    {r.users?.name || r.users?.email || r.user_id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-xs text-brand-accent">
                    {formatSupportDateTime(r.responded_at)}
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded-[10px] border border-brand-border bg-brand-mist p-2 text-xs text-brand-navy">
                    {JSON.stringify(r.response, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canMutate ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-brand-navy">Bewerken</h2>
          <PopupForm mode="edit" initial={row} canMutate />
        </div>
      ) : null}
    </div>
  );
}
