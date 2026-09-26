import Link from 'next/link';
import type { ContentReviewRow } from '@/lib/reviews/types';
import { formatSupportDateTime } from '@/lib/support/labels';
import { ReviewStatusBadge } from '@/components/reviews/ReviewStatusBadge';
import { planLabel } from '@/lib/users/types';

type Props = {
  rows: ContentReviewRow[];
};

export function ReviewList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center">
        <p className="text-sm font-medium text-brand-navy">Geen reviews gevonden</p>
        <p className="mt-1 text-sm text-brand-accent">
          Pas filters aan of maak een periodieke contentreview aan.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-brand-border bg-brand-white">
      <ul className="divide-y divide-brand-border">
        {rows.map((row) => {
          const userLabel =
            row.users?.name || row.users?.email || row.user_id.slice(0, 8);
          const period =
            row.period_start && row.period_end
              ? `${row.period_start} – ${row.period_end}`
              : row.review_date;

          return (
            <li key={row.id}>
              <Link
                href={`/reviews/${row.id}`}
                className="block px-4 py-4 transition hover:bg-brand-mist/70"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-navy">
                      {row.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-brand-accent">
                      {userLabel}
                      {row.subscription_tier
                        ? ` · ${planLabel(row.subscription_tier)}`
                        : ''}
                      {` · Periode ${period}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ReviewStatusBadge status={row.status} />
                    {row.scheduled_for ? (
                      <span className="text-xs text-brand-accent">
                        gepland {formatSupportDateTime(row.scheduled_for)}
                      </span>
                    ) : null}
                    {row.sent_at ? (
                      <span className="text-xs text-brand-accent">
                        verzonden {formatSupportDateTime(row.sent_at)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
