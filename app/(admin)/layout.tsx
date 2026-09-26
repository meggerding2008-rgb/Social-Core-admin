import { redirect } from 'next/navigation';
import {
  AuthRequiredError,
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { AdminShell } from '@/components/layout/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const admin = await requireAdmin();
    return <AdminShell admin={admin}>{children}</AdminShell>;
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      redirect('/login');
    }
    if (error instanceof ForbiddenAdminError) {
      redirect('/forbidden');
    }
    throw error;
  }
}
