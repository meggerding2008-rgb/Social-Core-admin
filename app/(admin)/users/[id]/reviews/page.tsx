import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManageReviews, canViewReviews } from '@/lib/auth/permissions';
import { listContentReviews, getUserReviewSchedule } from '@/lib/reviews/queries';
import { formatReviewDue } from '@/lib/reviews/frequency';
import { ReviewList } from '@/components/reviews/ReviewList';
import { getUserProfile } from '@/lib/users/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function UserReviewsPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewReviews(admin.profile.role)) throw new ForbiddenAdminError();

  const { row: user } = await getUserProfile(params.id);
  if (!user) notFound();

  const [reviewsResult, schedule] = await Promise.all([
    listContentReviews({ userId: user.id, status: 'all' }),
    getUserReviewSchedule(user.id),
  ]);

  const canMutate = canManageReviews(admin.profile.role);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">
            Contentreviews
          </h2>
          <p className="text-sm text-brand-accent">
            Periodieke reviews voor deze gebruiker.
          </p>
        </div>
        {canMutate ? (
          <Link
            href={`/reviews/new?userId=${user.id}`}
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent"
          >
            Nieuwe review
          </Link>
        ) : null}
      </div>

      {schedule ? (
        <section className="rounded-card border border-brand-border bg-brand-white p-5">
          <h3 className="text-sm font-semibold text-brand-navy">Planning</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Frequentie
              </dt>
              <dd className="text-sm text-brand-navy">
                {schedule.frequencyLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Volgende review
              </dt>
              <dd className="text-sm text-brand-navy">
                {formatReviewDue(schedule.nextDueDate)}
                {schedule.overdue ? ' (achterstallig)' : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Laatst verzonden
              </dt>
              <dd className="text-sm text-brand-navy">
                {schedule.lastSentAt
                  ? formatSupportDateTime(schedule.lastSentAt)
                  : 'Nog geen verzonden review'}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {reviewsResult.error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {reviewsResult.error}
        </div>
      ) : (
        <ReviewList rows={reviewsResult.rows} />
      )}
    </div>
  );
}
