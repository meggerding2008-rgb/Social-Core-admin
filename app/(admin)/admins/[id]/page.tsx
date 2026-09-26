import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getAdminProfile } from '@/lib/admins/queries';
import { AdminEditForm } from '@/components/admins/AdminForms';
import { formatSupportDateTime } from '@/lib/support/labels';
import type { AdminRole } from '@/lib/auth/types';

export const dynamic = 'force-dynamic';

export default async function AdminDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (admin.profile.role !== 'superadmin') redirect('/admins');

  const { row, error } = await getAdminProfile(params.id);
  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        <Link href="/admins" className="text-sm text-brand-navy">← Terug</Link>
      </div>
    );
  }
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/admins" className="text-sm text-brand-accent hover:text-brand-navy">
        ← Admins
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">
          {row.display_name || 'Admin'}
        </h1>
        <p className="mt-1 text-xs text-brand-accent">
          {row.user_id} · sinds {formatSupportDateTime(row.created_at)}
        </p>
      </div>
      <AdminEditForm
        userId={row.user_id}
        initialRole={row.role as AdminRole}
        initialActive={row.is_active}
        initialName={row.display_name || ''}
      />
    </div>
  );
}
