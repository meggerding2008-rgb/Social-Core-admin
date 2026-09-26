import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require-admin';
import { listAdminProfiles } from '@/lib/admins/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  const admin = await requireAdmin();
  if (admin.profile.role !== 'superadmin') redirect('/audit');

  const { rows, error } = await listAdminProfiles();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">Admins</h1>
          <p className="mt-1 text-sm text-brand-accent">
            Beheer van `admin_profiles` + Auth `app_metadata.platform_role`.
          </p>
        </div>
        <Link
          href="/admins/new"
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm text-white hover:bg-brand-accent"
        >
          Admin toevoegen
        </Link>
      </div>

      {error ? <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <ul className="rounded-card border border-brand-border bg-brand-white divide-y divide-brand-border overflow-hidden">
        {rows.map((row) => (
          <li key={row.user_id}>
            <Link href={`/admins/${row.user_id}`} className="block px-4 py-4 hover:bg-brand-mist/70">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-brand-navy">
                    {row.display_name || row.user_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-brand-accent">
                    {row.role} · {row.is_active ? 'actief' : 'inactief'}
                  </p>
                </div>
                <p className="text-xs text-brand-accent">
                  {formatSupportDateTime(row.created_at)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
