import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canManageReviews,
  canManageSupport,
  canManageUsers,
  canViewUsers,
} from '@/lib/auth/permissions';
import { isSupportMessageStatus } from '@/lib/support/types';
import {
  getUserProfile,
  getUserSubscription,
  getUserUsageCurrentMonth,
  listRecentPostsForUser,
  listRecentSupportForUser,
} from '@/lib/users/queries';
import {
  getUserReviewSchedule,
  listContentReviews,
} from '@/lib/reviews/queries';
import { formatReviewDue } from '@/lib/reviews/frequency';
import { ReviewStatusBadge } from '@/components/reviews/ReviewStatusBadge';
import {
  accountStatusLabel,
  planLabel,
  subscriptionStatusLabel,
} from '@/lib/users/types';
import { formatSupportDateTime } from '@/lib/support/labels';
import { UserAdminActions } from '@/components/users/UserAdminActions';
import { StatusBadge } from '@/components/support/StatusBadge';

export const dynamic = 'force-dynamic';

function usageLine(
  label: string,
  used: number | null | undefined,
  limit: number | null | undefined,
) {
  const u = used ?? 0;
  const lim = limit == null ? '∞' : String(limit);
  return `${label}: ${u} / ${lim}`;
}

export default async function UserOverviewPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewUsers(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { row: user, error } = await getUserProfile(params.id);
  if (error) {
    return (
      <div
        className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        {error}
      </div>
    );
  }
  if (!user) notFound();

  const [
    subscriptionResult,
    usageResult,
    postsResult,
    supportResult,
    schedule,
    reviewsResult,
  ] = await Promise.all([
    getUserSubscription(user.id),
    getUserUsageCurrentMonth(user.id),
    listRecentPostsForUser(user.id),
    listRecentSupportForUser(user.id),
    getUserReviewSchedule(user.id),
    listContentReviews({ userId: user.id }),
  ]);

  const canMutate = canManageUsers(admin.profile.role);
  const canReview = canManageReviews(admin.profile.role);
  const canContact = canManageSupport(admin.profile.role);
  const subscription = subscriptionResult.row;
  const usage = usageResult.row;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Overzicht</h2>
          <p className="text-sm text-brand-accent">
            Samenvatting van account, abonnement, gebruik en recente activiteit.
          </p>
        </div>
        {canContact ? (
          <Link
            href={`/app-support/new?userId=${user.id}`}
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent"
          >
            Nieuw bericht aan gebruiker
          </Link>
        ) : null}
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <h3 className="text-sm font-semibold text-brand-navy">Profiel</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Bedrijf
            </dt>
            <dd className="text-sm text-brand-navy">{user.company || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Functie
            </dt>
            <dd className="text-sm text-brand-navy">{user.job_title || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Telefoon
            </dt>
            <dd className="text-sm text-brand-navy">{user.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Branche
            </dt>
            <dd className="text-sm text-brand-navy">{user.industry || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Registratie
            </dt>
            <dd className="text-sm text-brand-navy">
              {formatSupportDateTime(user.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Onboarding
            </dt>
            <dd className="text-sm text-brand-navy">
              {user.onboarding_completed ? 'Afgerond' : 'Niet afgerond'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Accountstatus
            </dt>
            <dd className="text-sm text-brand-navy">
              {accountStatusLabel(user.account_status)}
              {user.blocked_reason ? ` — ${user.blocked_reason}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Tier (users)
            </dt>
            <dd className="text-sm text-brand-navy">
              {planLabel(user.subscription_tier)}
            </dd>
          </div>
        </dl>
        {user.description ? (
          <p className="mt-4 whitespace-pre-wrap border-t border-brand-border pt-3 text-sm text-brand-navy">
            {user.description}
          </p>
        ) : null}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">Abonnement</h3>
          <Link
            href={`/users/${user.id}/billing`}
            className="text-xs font-medium text-brand-navy hover:text-brand-accent"
          >
            Naar betalingen →
          </Link>
        </div>
        {subscriptionResult.error ? (
          <p className="mt-2 text-sm text-red-700">{subscriptionResult.error}</p>
        ) : subscription ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Plan
              </dt>
              <dd className="text-sm text-brand-navy">
                {planLabel(subscription.tier)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Status
              </dt>
              <dd className="text-sm text-brand-navy">
                {subscriptionStatusLabel(subscription.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Periode tot
              </dt>
              <dd className="text-sm text-brand-navy">
                {subscription.current_period_end
                  ? formatSupportDateTime(subscription.current_period_end)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Stripe subscription
              </dt>
              <dd className="truncate text-sm text-brand-navy">
                {subscription.stripe_subscription_id || '—'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-brand-accent">
            Geen abonnementsrij gevonden.
          </p>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Periodieke contentreviews
          </h3>
          {canReview ? (
            <Link
              href={`/reviews/new?userId=${user.id}`}
              className="text-xs font-medium text-brand-navy hover:text-brand-accent"
            >
              Nieuwe review
            </Link>
          ) : null}
        </div>
        {schedule ? (
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
        ) : (
          <p className="mt-2 text-sm text-brand-accent">
            Planning kon niet worden berekend.
          </p>
        )}
        {reviewsResult.rows.length > 0 ? (
          <ul className="mt-4 divide-y divide-brand-border border-t border-brand-border">
            {reviewsResult.rows.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <Link
                  href={`/reviews/${r.id}`}
                  className="truncate text-sm text-brand-navy hover:text-brand-accent"
                >
                  {r.title}
                </Link>
                <ReviewStatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-brand-accent">Nog geen reviews.</p>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Gebruik (huidige maand)
          </h3>
          <Link
            href={`/users/${user.id}/usage`}
            className="text-xs font-medium text-brand-navy hover:text-brand-accent"
          >
            Naar verbruik →
          </Link>
        </div>
        {usageResult.error ? (
          <p className="mt-2 text-sm text-red-700">{usageResult.error}</p>
        ) : usage ? (
          <ul className="mt-3 space-y-1 text-sm text-brand-navy">
            <li>{usageLine('Posts', usage.posts_used, usage.posts_limit)}</li>
            <li>
              {usageLine(
                'AI-generaties',
                usage.ai_generations_used,
                usage.ai_generations_limit,
              )}
            </li>
            <li>
              {usageLine(
                'Platformen',
                usage.platforms_used,
                usage.platforms_limit,
              )}
            </li>
            <li>
              {usageLine(
                'Teamleden',
                usage.team_members_used,
                usage.team_members_limit,
              )}
            </li>
            <li className="text-xs text-brand-accent">Maand: {usage.month}</li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-accent">
            Geen verbruiksdata voor deze maand.
          </p>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">Recente posts</h3>
          <Link
            href={`/users/${user.id}/posts`}
            className="text-xs font-medium text-brand-navy hover:text-brand-accent"
          >
            Alle posts →
          </Link>
        </div>
        {postsResult.error ? (
          <p className="mt-2 text-sm text-red-700">{postsResult.error}</p>
        ) : postsResult.rows.length === 0 ? (
          <p className="mt-2 text-sm text-brand-accent">Geen posts.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-border">
            {postsResult.rows.map((post) => (
              <li
                key={post.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-brand-navy">
                    {post.title || 'Zonder titel'}
                  </p>
                  <p className="text-xs text-brand-accent">
                    {post.status || '—'} ·{' '}
                    {formatSupportDateTime(post.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Supporttickets
          </h3>
          <Link
            href={`/users/${user.id}/support`}
            className="text-xs font-medium text-brand-navy hover:text-brand-accent"
          >
            Alle support →
          </Link>
        </div>
        {supportResult.error ? (
          <p className="mt-2 text-sm text-red-700">{supportResult.error}</p>
        ) : supportResult.rows.length === 0 ? (
          <p className="mt-2 text-sm text-brand-accent">Geen tickets.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-border">
            {supportResult.rows.map((ticket) => (
              <li key={ticket.id} className="py-2">
                <Link
                  href={`/app-support/${ticket.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 hover:text-brand-accent"
                >
                  <span className="text-sm text-brand-navy">
                    {ticket.subject || 'Zonder onderwerp'}
                  </span>
                  <span className="flex items-center gap-2">
                    {isSupportMessageStatus(ticket.status) ? (
                      <StatusBadge status={ticket.status} />
                    ) : (
                      <span className="text-xs text-brand-accent">
                        {ticket.status}
                      </span>
                    )}
                    <span className="text-xs text-brand-accent">
                      {formatSupportDateTime(ticket.created_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <UserAdminActions user={user} canMutate={canMutate} />
    </div>
  );
}
