import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require-admin';
import { AdminCreateForm } from '@/components/admins/AdminForms';

export const dynamic = 'force-dynamic';

export default async function NewAdminPage() {
  const admin = await requireAdmin();
  if (admin.profile.role !== 'superadmin') redirect('/admins');

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Link href="/admins" className="text-sm text-brand-accent hover:text-brand-navy">
        ← Admins
      </Link>
      <h1 className="text-2xl font-semibold text-brand-navy">Admin toevoegen</h1>
      <AdminCreateForm />
    </div>
  );
}
