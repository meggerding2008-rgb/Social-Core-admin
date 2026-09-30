import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManagePosts, canViewPosts } from '@/lib/auth/permissions';
import { getPostForUser } from '@/lib/user-posts/queries';
import { UserPostDetailForm } from '@/components/users/UserPostDetailForm';

export const dynamic = 'force-dynamic';

export default async function UserPostDetailPage({
  params,
}: {
  params: { id: string; postId: string };
}) {
  const admin = await requireAdmin();
  if (!canViewPosts(admin.profile.role)) throw new ForbiddenAdminError();

  const { row, error } = await getPostForUser(params.id, params.postId);
  if (error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!row) notFound();

  return (
    <UserPostDetailForm
      userId={params.id}
      post={row}
      canMutate={canManagePosts(admin.profile.role)}
    />
  );
}
