import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canViewAudit } from '@/lib/auth/permissions';
import { listAuditLogsForUser } from '@/lib/admins/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function UserActivityPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewAudit(admin.profile.role)) throw new ForbiddenAdminError();

  const { rows, error } = await listAuditLogsForUser(params.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Activiteit</h2>
        <p className="text-sm text-brand-accent">
          Admin-auditlogs gerelateerd aan deze gebruiker (`admin_audit_logs`).
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-brand-accent">Geen auditregels gevonden.</p>
      ) : (
        <div className="overflow-hidden rounded-card border border-brand-border bg-brand-white">
          <ul className="divide-y divide-brand-border">
            {rows.map((log) => (
              <li key={log.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-brand-navy">
                    {log.action}
                  </p>
                  <time className="text-xs text-brand-accent">
                    {formatSupportDateTime(log.created_at)}
                  </time>
                </div>
                <p className="mt-1 text-xs text-brand-accent">
                  {log.resource_type}
                  {log.resource_id ? ` · ${log.resource_id}` : ''} · actor{' '}
                  {log.actor_id.slice(0, 8)}…
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
