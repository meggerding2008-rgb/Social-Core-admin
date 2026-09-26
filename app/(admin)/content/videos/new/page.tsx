import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateCms, canReadCms } from '@/lib/content/types';
import { VideoForm } from '@/components/content/VideoForm';

export const dynamic = 'force-dynamic';

export default async function NewVideoPage() {
  const admin = await requireAdmin();
  if (!canReadCms(admin.profile.role)) throw new ForbiddenAdminError();
  if (!canMutateCms(admin.profile.role)) redirect('/content/videos');

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/content/videos"
          className="text-sm text-brand-accent hover:text-brand-navy"
        >
          ← Video’s
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-brand-navy">
          Nieuwe videotutorial
        </h1>
      </div>
      <VideoForm mode="create" canMutate />
    </div>
  );
}
