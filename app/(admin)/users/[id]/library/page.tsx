import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManageLibrary, canViewLibrary } from '@/lib/auth/permissions';
import { listMediaForUser } from '@/lib/user-library/queries';
import { UserLibraryPanel } from '@/components/users/UserLibraryPanel';

export const dynamic = 'force-dynamic';

export default async function UserLibraryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { archived?: string; q?: string };
}) {
  const admin = await requireAdmin();
  if (!canViewLibrary(admin.profile.role)) throw new ForbiddenAdminError();

  const includeArchived = searchParams.archived === '1';
  const q = searchParams.q ?? '';
  const { rows, error } = await listMediaForUser(params.id, {
    includeArchived,
    q,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Bibliotheek</h2>
        <p className="text-sm text-brand-accent">
          Mediabestanden uit `post_media_assets`. Archiveren is soft (geen
          storage-wipe).
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <UserLibraryPanel
        userId={params.id}
        rows={rows}
        canMutate={canManageLibrary(admin.profile.role)}
        includeArchived={includeArchived}
        q={q}
      />
    </div>
  );
}
