import { redirect } from 'next/navigation';
import {
  AuthRequiredError,
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

/**
 * Root entry: send visitors to the right place.
 * Middleware already gates sessions; this is a safety net only.
 */
export default async function HomePage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      redirect('/login');
    }
    if (error instanceof ForbiddenAdminError) {
      redirect('/forbidden');
    }
    throw error;
  }

  redirect('/dashboard');
}
