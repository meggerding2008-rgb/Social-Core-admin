import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateReviews, canReadReviews } from '@/lib/reviews/types';
import {
  getContentReviewById,
  listUsersForReviewSelect,
} from '@/lib/reviews/queries';
import { formatSupportDateTime } from '@/lib/support/labels';
import { planLabel } from '@/lib/users/types';
import { ReviewStatusBadge } from '@/components/reviews/ReviewStatusBadge';
import { ReviewForm } from '@/components/reviews/ReviewForm';

export const dynamic = 'force-dynamic';

export default async function ReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canReadReviews(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { row, error } = await getContentReviewById(params.id);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
        <Link href="/reviews" className="text-sm font-medium text-brand-navy">
          ← Terug naar reviews
        </Link>
      </div>
    );
  }

  if (!row) notFound();

  const canMutate = canMutateReviews(admin.profile.role);
  const users = await listUsersForReviewSelect();
  const userLabel = row.users?.name || row.users?.email || row.user_id;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/reviews"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← Terug naar reviews
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            {row.title}
          </h1>
          <ReviewStatusBadge status={row.status} />
        </div>
        <p className="mt-1 text-sm text-brand-accent">
          {userLabel}
          {row.subscription_tier
            ? ` · ${planLabel(row.subscription_tier)}`
            : ''}
          {row.period_start && row.period_end
            ? ` · Periode ${row.period_start} – ${row.period_end}`
            : ''}
        </p>
        <p className="mt-1 text-xs text-brand-accent">
          Aangemaakt {formatSupportDateTime(row.created_at)}
          {row.scheduled_for
            ? ` · Gepland ${formatSupportDateTime(row.scheduled_for)}`
            : ''}
          {row.sent_at
            ? ` · Verzonden ${formatSupportDateTime(row.sent_at)}`
            : ''}
        </p>
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5 space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Gebruiker
            </dt>
            <dd className="text-sm text-brand-navy">
              <Link
                href={`/users/${row.user_id}`}
                className="font-medium hover:text-brand-accent"
              >
                {userLabel}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Abonnement
            </dt>
            <dd className="text-sm text-brand-navy">
              {planLabel(row.subscription_tier)}
            </dd>
          </div>
        </dl>

        {(
          [
            ['Samenvatting', row.summary],
            ['Wat ging goed', row.what_went_well],
            ['Wat beter kan', row.improvement_points],
            ['Analyse contentprestaties', row.performance_analysis],
            ['Aanbevelingen', row.recommendations],
            ['Contenttypes', row.recommended_content_types],
            ['Postingfrequentie', row.recommended_posting_frequency],
            ['Platformaanbevelingen', row.platform_recommendations],
            ['Conclusie', row.conclusion],
          ] as const
        ).map(([label, value]) =>
          value ? (
            <div key={label} className="border-t border-brand-border pt-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                {label}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy">
                {value}
              </p>
            </div>
          ) : null,
        )}

        {!row.summary && row.feedback ? (
          <div className="border-t border-brand-border pt-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              Feedback (legacy)
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy">
              {row.feedback}
            </p>
          </div>
        ) : null}
      </section>

      {canMutate ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-brand-navy">Bewerken</h2>
          <ReviewForm
            mode="edit"
            users={users}
            initial={row}
            canMutate
          />
        </div>
      ) : (
        <div className="rounded-card border border-brand-border bg-brand-white p-5">
          <p className="text-sm text-brand-accent">
            Alleen content-admins en superadmins mogen reviews bewerken.
          </p>
        </div>
      )}
    </div>
  );
}
