import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canContactUsers, canReadSupport } from '@/lib/support/types';
import { listUsersForSupportSelect } from '@/lib/support/queries';
import { ContactUserForm } from '@/components/support/ContactUserForm';

export const dynamic = 'force-dynamic';

export default async function AppSupportNewMessagePage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const admin = await requireAdmin();
  if (!canReadSupport(admin.profile.role)) throw new ForbiddenAdminError();
  if (!canContactUsers(admin.profile.role)) redirect('/app-support');

  const users = await listUsersForSupportSelect();
  const defaultUserId =
    searchParams.userId && users.some((u) => u.id === searchParams.userId)
      ? searchParams.userId
      : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          href="/app-support"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← App support
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy">
          Nieuw bericht aan gebruiker
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          Benader een gebruiker zonder dat die eerst contact heeft opgenomen.
        </p>
      </div>

      <div className="rounded-card border border-brand-border bg-brand-white p-5">
        <ContactUserForm
          users={users}
          defaultUserId={defaultUserId}
          lockUser={Boolean(defaultUserId)}
        />
      </div>
    </div>
  );
}
