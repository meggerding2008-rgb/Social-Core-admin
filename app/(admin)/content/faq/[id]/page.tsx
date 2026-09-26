import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateCms, canReadCms } from '@/lib/content/types';
import { getFaqItemById } from '@/lib/content/queries';
import { FaqForm } from '@/components/content/FaqForm';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function FaqDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canReadCms(admin.profile.role)) throw new ForbiddenAdminError();

  const { row, error } = await getFaqItemById(params.id);
  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
        <Link href="/content/faq" className="text-sm text-brand-navy">
          ← Terug
        </Link>
      </div>
    );
  }
  if (!row) notFound();

  const canMutate = canMutateCms(admin.profile.role);

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
          {row.question}
        </h1>
        <p className="mt-1 text-xs text-brand-accent">
          {row.is_published ? 'Gepubliceerd' : 'Verborgen'} · gewijzigd{' '}
          {formatSupportDateTime(row.updated_at)}
        </p>
      </div>

      {!canMutate ? (
        <section className="rounded-card border border-brand-border bg-brand-white p-5">
          <p className="whitespace-pre-wrap text-sm text-brand-navy">{row.answer}</p>
        </section>
      ) : null}

      <FaqForm mode="edit" initial={row} canMutate={canMutate} />
    </div>
  );
}
