import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateReviews, canReadReviews } from '@/lib/reviews/types';
import { listUsersForReviewSelect } from '@/lib/reviews/queries';
import { ReviewForm } from '@/components/reviews/ReviewForm';

export const dynamic = 'force-dynamic';

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: { userId?: string };
}) {
  const admin = await requireAdmin();
  if (!canReadReviews(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }
  if (!canMutateReviews(admin.profile.role)) {
    redirect('/reviews');
  }

  const users = await listUsersForReviewSelect();
  const defaultUserId =
    searchParams.userId && users.some((u) => u.id === searchParams.userId)
      ? searchParams.userId
      : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/reviews"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← Terug naar reviews
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy">
          Nieuwe periodieke contentreview
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          Beoordeel de totale contentprestaties over een periode. Notificatie
          alleen bij status Verzonden.
        </p>
      </div>

      <ReviewForm
        mode="create"
        users={users}
        defaultUserId={defaultUserId}
        canMutate
      />
    </div>
  );
}
