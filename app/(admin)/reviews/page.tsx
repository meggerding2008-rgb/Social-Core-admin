import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateReviews, canReadReviews } from '@/lib/reviews/types';
import {
  listContentReviews,
  listUsersForReviewSelect,
  listUsersNeedingReviews,
} from '@/lib/reviews/queries';
import { formatReviewDue } from '@/lib/reviews/frequency';
import { ReviewFilters } from '@/components/reviews/ReviewFilters';
import { ReviewList } from '@/components/reviews/ReviewList';

export const dynamic = 'force-dynamic';

type SearchParams = {
  status?: string;
  userId?: string;
  tier?: string;
  from?: string;
  to?: string;
  q?: string;
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdmin();
  if (!canReadReviews(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const status = searchParams.status ?? 'all';
  const userId = searchParams.userId ?? '';
  const tier = searchParams.tier ?? 'all';
  const from = searchParams.from ?? '';
  const to = searchParams.to ?? '';
  const q = searchParams.q ?? '';

  const [{ rows, error }, users, due] = await Promise.all([
    listContentReviews({
      status,
      userId: userId || undefined,
      tier,
      from,
      to,
      q,
    }),
    listUsersForReviewSelect(),
    listUsersNeedingReviews({ soonDays: 14, limit: 8 }),
  ]);

  const canMutate = canMutateReviews(admin.profile.role);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Contentreviews
          </h1>
          <p className="mt-1 text-sm text-brand-accent">
            Periodieke totaalreviews van socialmediaresultaten per gebruiker —
            geen postreviews.
          </p>
        </div>
        {canMutate ? (
          <Link
            href="/reviews/new"
            className="inline-flex rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent"
          >
            Nieuwe review
          </Link>
        ) : null}
      </div>

      {due.length > 0 ? (
        <section className="rounded-card border border-brand-border bg-brand-white p-4">
          <h2 className="text-sm font-semibold text-brand-navy">
            Reviews die (binnenkort) gemaakt moeten worden
          </h2>
          <ul className="mt-3 divide-y divide-brand-border">
            {due.map((item) => (
              <li
                key={item.userId}
                className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm text-brand-navy">{item.label}</p>
                  <p className="text-xs text-brand-accent">
                    {item.frequencyLabel} · volgende:{' '}
                    {formatReviewDue(item.nextDueDate)}
                    {item.overdue ? ' · achterstallig' : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/users/${item.userId}`}
                    className="text-xs font-medium text-brand-accent hover:text-brand-navy"
                  >
                    Gebruiker
                  </Link>
                  {canMutate ? (
                    <Link
                      href={`/reviews/new?userId=${item.userId}`}
                      className="text-xs font-medium text-brand-navy hover:text-brand-accent"
                    >
                      Review maken
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ReviewFilters
        status={status}
        userId={userId}
        tier={tier}
        from={from}
        to={to}
        q={q}
        users={users}
      />

      {error ? (
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <p className="text-sm text-brand-accent">
        {rows.length} {rows.length === 1 ? 'review' : 'reviews'}
      </p>

      <ReviewList rows={rows} />
    </div>
  );
}
