import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManagePosts, canViewPosts } from '@/lib/auth/permissions';
import { listPostsForUser } from '@/lib/user-posts/queries';
import { UserPostsPanel } from '@/components/users/UserPostsPanel';

export const dynamic = 'force-dynamic';

export default async function UserPostsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string; q?: string };
}) {
  const admin = await requireAdmin();
  if (!canViewPosts(admin.profile.role)) throw new ForbiddenAdminError();

  const status = searchParams.status ?? 'all';
  const q = searchParams.q ?? '';
  const { rows, error } = await listPostsForUser(params.id, { status, q });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Posts</h2>
        <p className="text-sm text-brand-accent">
          Beheer posts van deze gebruiker. Geen mockdata — live uit `posts`.
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <UserPostsPanel
        userId={params.id}
        rows={rows}
        canMutate={canManagePosts(admin.profile.role)}
        status={status}
        q={q}
      />
    </div>
  );
}
