import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateBroadcasts, canReadBroadcasts } from '@/lib/broadcasts/types';
import { BroadcastForm } from '@/components/broadcasts/BroadcastForm';

export const dynamic = 'force-dynamic';

export default async function NewBroadcastPage() {
  const admin = await requireAdmin();
  if (!canReadBroadcasts(admin.profile.role)) throw new ForbiddenAdminError();
  if (!canMutateBroadcasts(admin.profile.role)) redirect('/broadcasts');

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/broadcasts" className="text-sm text-brand-accent hover:text-brand-navy">
        ← Broadcasts
      </Link>
      <h1 className="text-2xl font-semibold text-brand-navy">Nieuwe broadcast</h1>
      <BroadcastForm mode="create" canMutate />
    </div>
  );
}
