import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateCms, canReadCms } from '@/lib/content/types';
import { listFaqItems, listVideoTutorials } from '@/lib/content/queries';

export const dynamic = 'force-dynamic';

export default async function ContentHubPage() {
  const admin = await requireAdmin();
  if (!canReadCms(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const [faq, videos] = await Promise.all([
    listFaqItems({}),
    listVideoTutorials({}),
  ]);

  const canMutate = canMutateCms(admin.profile.role);
  const faqPublished = faq.rows.filter((r) => r.is_published).length;
  const videoPublished = videos.rows.filter((r) => r.is_published).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Content
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          CMS voor FAQ’s en videotutorials in de gebruikersapp (Support).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/content/faq"
          className="rounded-card border border-brand-border bg-brand-white p-5 transition hover:border-brand-accent"
        >
          <h2 className="text-lg font-semibold text-brand-navy">FAQ’s</h2>
          <p className="mt-2 text-sm text-brand-accent">
            {faq.rows.length} items · {faqPublished} gepubliceerd
          </p>
          {canMutate ? (
            <p className="mt-3 text-sm font-medium text-brand-navy">Beheren →</p>
          ) : (
            <p className="mt-3 text-sm font-medium text-brand-navy">Bekijken →</p>
          )}
        </Link>

        <Link
          href="/content/videos"
          className="rounded-card border border-brand-border bg-brand-white p-5 transition hover:border-brand-accent"
        >
          <h2 className="text-lg font-semibold text-brand-navy">
            Videotutorials
          </h2>
          <p className="mt-2 text-sm text-brand-accent">
            {videos.rows.length} items · {videoPublished} gepubliceerd
          </p>
          {canMutate ? (
            <p className="mt-3 text-sm font-medium text-brand-navy">Beheren →</p>
          ) : (
            <p className="mt-3 text-sm font-medium text-brand-navy">Bekijken →</p>
          )}
        </Link>
      </div>
    </div>
  );
}
