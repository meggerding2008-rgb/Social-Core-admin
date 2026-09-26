import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canReadUsers } from '@/lib/users/types';
import { listUsers } from '@/lib/users/queries';
import { UserFilters } from '@/components/users/UserFilters';
import { UserList } from '@/components/users/UserList';

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  plan?: string;
  status?: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdmin();
  if (!canReadUsers(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const q = searchParams.q ?? '';
  const plan = searchParams.plan ?? 'all';
  const status = searchParams.status ?? 'all';

  const { rows, error } = await listUsers({ q, plan, status });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Gebruikers
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          Overzicht van Social Core-accounts. Geen accounts verwijderen in deze
          fase.
        </p>
      </div>

      <UserFilters q={q} plan={plan} status={status} />

      {error ? (
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <p className="text-sm text-brand-accent">
        {rows.length} {rows.length === 1 ? 'gebruiker' : 'gebruikers'}
      </p>

      <UserList rows={rows} />
    </div>
  );
}
