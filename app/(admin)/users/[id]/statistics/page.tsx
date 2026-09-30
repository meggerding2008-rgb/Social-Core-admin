import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canViewStatistics } from '@/lib/auth/permissions';
import {
  getLastMetricsSync,
  listConnectedPlatforms,
  listMetricsForUser,
  listPostMetricsForUser,
} from '@/lib/user-stats/queries';
import { RefreshUserStatisticsButton } from '@/components/users/RefreshUserStatisticsButton';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export default async function UserStatisticsPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewStatistics(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const userId = params.id;
  const [metrics, postMetrics, connections, lastSync] = await Promise.all([
    listMetricsForUser(userId),
    listPostMetricsForUser(userId),
    listConnectedPlatforms(userId),
    getLastMetricsSync(userId),
  ]);

  const errors = [
    metrics.error,
    postMetrics.error,
    connections.error,
    lastSync.error,
  ].filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Statistieken</h2>
          <p className="text-sm text-brand-accent">
            Live uit `social_account_metrics`, `post_metrics` en
            `platform_connections` (zonder tokens).
          </p>
          <p className="mt-1 text-xs text-brand-accent">
            Laatste metrics-sync:{' '}
            {lastSync.at ? formatSupportDateTime(lastSync.at) : '—'}
          </p>
        </div>
        <RefreshUserStatisticsButton userId={userId} />
      </div>

      {errors.length > 0 ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.join(' ')}
        </div>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-navy">
          Accountmetrics (recent per platform)
        </h3>
        <div className="overflow-x-auto rounded-card border border-brand-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand-border bg-brand-cream/40 text-xs uppercase tracking-wide text-brand-accent">
              <tr>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Volgers</th>
                <th className="px-3 py-2">Reach</th>
                <th className="px-3 py-2">Impressies</th>
                <th className="px-3 py-2">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-brand-navy">
              {metrics.rows.map((row) => (
                <tr key={`${row.platform}-${row.platform_account_id ?? ''}`}>
                  <td className="px-3 py-2">{row.platform}</td>
                  <td className="px-3 py-2">{cell(row.metric_date)}</td>
                  <td className="px-3 py-2">{cell(row.followers)}</td>
                  <td className="px-3 py-2">{cell(row.reach)}</td>
                  <td className="px-3 py-2">{cell(row.impressions)}</td>
                  <td className="px-3 py-2">{cell(row.engagement_rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {metrics.rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-brand-accent">Geen rijen.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-navy">
          Platformkoppelingen
        </h3>
        <div className="overflow-x-auto rounded-card border border-brand-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand-border bg-brand-cream/40 text-xs uppercase tracking-wide text-brand-accent">
              <tr>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Gebruikersnaam</th>
                <th className="px-3 py-2">Organisatie</th>
                <th className="px-3 py-2">Gekoppeld</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-brand-navy">
              {connections.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">{row.platform}</td>
                  <td className="px-3 py-2">{cell(row.platform_username)}</td>
                  <td className="px-3 py-2">{cell(row.organization_name)}</td>
                  <td className="px-3 py-2">
                    {row.connected_at
                      ? formatSupportDateTime(row.connected_at)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {connections.rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-brand-accent">
              Geen koppelingen.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-brand-navy">
          Postmetrics (max. 50)
        </h3>
        <div className="overflow-x-auto rounded-card border border-brand-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-brand-border bg-brand-cream/40 text-xs uppercase tracking-wide text-brand-accent">
              <tr>
                <th className="px-3 py-2">Post</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Likes</th>
                <th className="px-3 py-2">Comments</th>
                <th className="px-3 py-2">Reach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border text-brand-navy">
              {postMetrics.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.post_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2">{row.platform}</td>
                  <td className="px-3 py-2">{cell(row.metric_date)}</td>
                  <td className="px-3 py-2">{cell(row.likes)}</td>
                  <td className="px-3 py-2">{cell(row.comments)}</td>
                  <td className="px-3 py-2">{cell(row.reach)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {postMetrics.rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-brand-accent">Geen rijen.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
