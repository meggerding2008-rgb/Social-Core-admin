import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutatePopups, canReadPopups } from '@/lib/popups/types';
import { PopupForm } from '@/components/popups/PopupForm';

export const dynamic = 'force-dynamic';

export default async function NewPopupPage() {
  const admin = await requireAdmin();
  if (!canReadPopups(admin.profile.role)) throw new ForbiddenAdminError();
  if (!canMutatePopups(admin.profile.role)) redirect('/popups');

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/popups"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← Pop-ups
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy">
          Nieuwe pop-up
        </h1>
      </div>
      <PopupForm mode="create" canMutate />
    </div>
  );
}
