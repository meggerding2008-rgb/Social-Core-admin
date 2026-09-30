import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  canImpersonate,
  canManageReviews,
  canManageSupport,
  canManageUsers,
  canViewUsers,
} from '@/lib/auth/permissions';
import { isSupportMessageStatus } from '@/lib/support/types';
import {
  getPostStatusCountsForUser,
  getUserLastActivityAt,
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
import { ImpersonationButton } from '@/components/users/ImpersonationButton';
import { StatusBadge } from '@/components/support/StatusBadge';
import { isUserId } from '@/lib/users/validate-id';
import { postStatusLabel } from '@/lib/user-posts/types';

export const dynamic = 'force-dynamic';

const EMPTY = 'Geen gegevens beschikbaar.';

function usageLine(
  label: string,
  used: number | null | undefined,
  limit: number | null | undefined,
) {
  const u = used ?? 0;
  const lim = limit == null ? '∞' : String(limit);
  return `${label}: ${u} / ${lim}`;
}

async function safe<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(
      `[users/overview] ${label}:`,
      err instanceof Error ? err.message : 'unknown',
    );
    return fallback;
  }
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

  if (!isUserId(params.id)) {
    notFound();
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
    postCountsResult,
    lastActivityResult,
  ] = await Promise.all([
    safe('subscription', () => getUserSubscription(user.id), {
      row: null,
      error: null,
    }),
    safe('usage', () => getUserUsageCurrentMonth(user.id), {
      row: null,
      error: null,
    }),
    safe('posts', () => listRecentPostsForUser(user.id, 8), {
      rows: [],
      error: null,
    }),
    safe('support', () => listRecentSupportForUser(user.id, 8), {
      rows: [],
      error: null,
    }),
    safe('schedule', () => getUserReviewSchedule(user.id), null),
    safe('reviews', () => listContentReviews({ userId: user.id }), {
      rows: [],
      error: null,
    }),
    safe('postCounts', () => getPostStatusCountsForUser(user.id), {
      counts: {
        total: 0,
        draft: 0,
        awaitingApproval: 0,
        scheduled: 0,
        published: 0,
        failed: 0,
      },
      error: null,
    }),
    safe('lastActivity', () => getUserLastActivityAt(user.id), {
      at: null,
      error: null,
    }),
  ]);

  const canMutate = canManageUsers(admin.profile.role);
  const canReview = canManageReviews(admin.profile.role);
  const canContact = canManageSupport(admin.profile.role);
  const subscription = subscriptionResult.row;
  const usage = usageResult.row;
  const counts = postCountsResult.counts;
  const reviewRows = reviewsResult.rows ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Overzicht</h2>
          <p className="text-sm text-brand-accent">
            Centrale beheersamenvatting. Details staan onder de tabs.
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
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Volledige naam
            </dt>
            <dd className="text-sm text-brand-navy">{user.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              E-mailadres
            </dt>
            <dd className="text-sm text-brand-navy">{user.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Bedrijfsnaam
            </dt>
            <dd className="text-sm text-brand-navy">{user.company || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Branche
            </dt>
            <dd className="text-sm text-brand-navy">{user.industry || '—'}</dd>
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
              Onboarding
            </dt>
            <dd className="text-sm text-brand-navy">
              {user.onboarding_completed ? 'Afgerond' : 'Niet afgerond'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Registratiedatum
            </dt>
            <dd className="text-sm text-brand-navy">
              {user.created_at
                ? formatSupportDateTime(user.created_at)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Laatste activiteit
            </dt>
            <dd className="text-sm text-brand-navy">
              {lastActivityResult.at
                ? formatSupportDateTime(lastActivityResult.at)
                : EMPTY}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-brand-accent">
              Tier (profiel)
            </dt>
            <dd className="text-sm text-brand-navy">
              {planLabel(user.subscription_tier)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Posts en kalender
          </h3>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            <Link
              href={`/users/${user.id}/posts`}
              className="text-brand-navy hover:text-brand-accent"
            >
              Beheren →
            </Link>
            <Link
              href={`/users/${user.id}/calendar`}
              className="text-brand-navy hover:text-brand-accent"
            >
              Kalender →
            </Link>
          </div>
        </div>
        {postCountsResult.error ? (
          <p className="mt-2 text-sm text-red-700">{postCountsResult.error}</p>
        ) : counts.total === 0 ? (
          <p className="mt-2 text-sm text-brand-accent">{EMPTY}</p>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Totaal', counts.total],
              ['Concepten', counts.draft],
              ['Goedgekeurd', counts.awaitingApproval],
              ['Gepland', counts.scheduled],
              ['Gepubliceerd', counts.published],
              ['Mislukt', counts.failed],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs uppercase tracking-wide text-brand-accent">
                  {label}
                </dt>
                <dd className="text-lg font-semibold text-brand-navy">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {postsResult.error ? (
          <p className="mt-3 text-sm text-red-700">{postsResult.error}</p>
        ) : postsResult.rows.length === 0 ? (
          <p className="mt-3 text-sm text-brand-accent">Geen recente posts.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-border border-t border-brand-border">
            {postsResult.rows.map((post) => (
              <li key={post.id} className="py-2">
                <Link
                  href={`/users/${user.id}/posts/${post.id}`}
                  className="flex items-center justify-between gap-3 hover:text-brand-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-brand-navy">
                      {post.title || 'Zonder titel'}
                    </p>
                    <p className="text-xs text-brand-accent">
                      {postStatusLabel(post.status)} ·{' '}
                      {formatSupportDateTime(post.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-brand-accent">
                    Bewerken →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Abonnement en betalingen
          </h3>
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
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Huidig pakket
              </dt>
              <dd className="text-sm text-brand-navy">
                {planLabel(subscription.tier)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Abonnementsstatus
              </dt>
              <dd className="text-sm text-brand-navy">
                {subscriptionStatusLabel(subscription.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Trialstatus
              </dt>
              <dd className="text-sm text-brand-navy">
                {String(subscription.status).toLowerCase() === 'trialing'
                  ? 'In trial'
                  : 'Geen trial'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Startdatum periode
              </dt>
              <dd className="text-sm text-brand-navy">
                {subscription.current_period_start
                  ? formatSupportDateTime(subscription.current_period_start)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Verlengingsdatum
              </dt>
              <dd className="text-sm text-brand-navy">
                {subscription.current_period_end
                  ? formatSupportDateTime(subscription.current_period_end)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-brand-accent">
                Betaalprobleem
              </dt>
              <dd className="text-sm text-brand-navy">
                {['past_due', 'unpaid', 'incomplete'].includes(
                  String(subscription.status).toLowerCase(),
                )
                  ? 'Ja — controleer betalingen'
                  : 'Nee'}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-brand-accent">{EMPTY}</p>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Verbruik (huidige maand)
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
                'AI-verbruik',
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
            <li className="text-xs text-brand-accent">Periode: {usage.month}</li>
          </ul>
        ) : (
          <p className="mt-2 text-sm text-brand-accent">{EMPTY}</p>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-brand-navy">
            Contentreviews
          </h3>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            {canReview ? (
              <Link
                href={`/reviews/new?userId=${user.id}`}
                className="text-brand-navy hover:text-brand-accent"
              >
                Nieuwe review
              </Link>
            ) : null}
            <Link
              href={`/users/${user.id}/reviews`}
              className="text-brand-navy hover:text-brand-accent"
            >
              Alle reviews →
            </Link>
          </div>
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
                  : EMPTY}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-brand-accent">{EMPTY}</p>
        )}
        {reviewRows.length > 0 ? (
          <ul className="mt-4 divide-y divide-brand-border border-t border-brand-border">
            {reviewRows.slice(0, 5).map((r) => (
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
          <p className="mt-3 text-sm text-brand-accent">{EMPTY}</p>
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
          <p className="mt-2 text-sm text-brand-accent">{EMPTY}</p>
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

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <h3 className="text-sm font-semibold text-brand-navy">
          Snelle secties
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ['Statistieken', `/users/${user.id}/statistics`],
            ['Trends', `/users/${user.id}/trends`],
            ['Concurrenten', `/users/${user.id}/competitors`],
            ['Bibliotheek', `/users/${user.id}/library`],
            ['Instellingen', `/users/${user.id}/profile-settings`],
            ['Team', `/users/${user.id}/team`],
            ['Audit', `/users/${user.id}/activity`],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-1.5 text-sm text-brand-navy hover:border-brand-accent"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <ImpersonationButton
        userId={user.id}
        canImpersonate={canImpersonate(admin.profile.role)}
      />
      <UserAdminActions user={user} canMutate={canMutate} />
    </div>
  );
}
