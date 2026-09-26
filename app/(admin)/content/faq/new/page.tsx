import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateCms, canReadCms } from '@/lib/content/types';
import { FaqForm } from '@/components/content/FaqForm';

export const dynamic = 'force-dynamic';

export default async function NewFaqPage() {
  const admin = await requireAdmin();
  if (!canReadCms(admin.profile.role)) throw new ForbiddenAdminError();
  if (!canMutateCms(admin.profile.role)) redirect('/content/faq');

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/content/faq"
          className="text-sm text-brand-accent hover:text-brand-navy"
        >
          ← FAQ’s
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-brand-navy">
          Nieuwe FAQ
        </h1>
      </div>
      <FaqForm mode="create" canMutate />
    </div>
  );
}
