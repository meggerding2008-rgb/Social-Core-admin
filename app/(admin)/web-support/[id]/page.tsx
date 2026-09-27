import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateSupport, canReadSupport } from '@/lib/support/types';
import { formatSupportDateTime } from '@/lib/support/labels';
import { getWebsiteMessageById } from '@/lib/web-support/queries';
import { websiteMessageStatusLabel } from '@/lib/web-support/types';
import { WebSupportActions } from '@/components/web-support/WebSupportActions';

export const dynamic = 'force-dynamic';

export default async function WebSupportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canReadSupport(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const { row, error } = await getWebsiteMessageById(params.id);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl">
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
        <Link
          href="/web-support"
          className="mt-4 inline-block text-sm font-medium text-brand-navy hover:text-brand-accent"
        >
          ← Terug naar Web support
        </Link>
      </div>
    );
  }

  if (!row) notFound();

  const canMutate = canMutateSupport(admin.profile.role);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/web-support"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← Terug naar Web support
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-brand-navy">
          {row.subject?.trim() || 'Websitebericht'}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-[8px] border border-brand-border px-2 py-0.5 text-xs text-brand-navy">
            {websiteMessageStatusLabel(row.status)}
          </span>
          <span className="rounded-[8px] border border-brand-border px-2 py-0.5 text-xs text-brand-navy">
            {row.source}
          </span>
          <span className="text-xs text-brand-accent">
            {formatSupportDateTime(row.created_at)}
          </span>
        </div>
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              Afzender
            </dt>
            <dd className="mt-1 text-sm text-brand-navy">{row.sender_name}</dd>
            <dd className="text-xs text-brand-accent">{row.sender_email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              Gekoppelde gebruiker
            </dt>
            <dd className="mt-1 text-sm text-brand-navy">
              {row.users
                ? row.users.name || row.users.email || row.user_id
                : 'Niet gekoppeld'}
            </dd>
            {row.user_id ? (
              <dd>
                <Link
                  href={`/users/${row.user_id}`}
                  className="text-xs font-medium text-brand-accent hover:text-brand-navy"
                >
                  Open gebruikersprofiel
                </Link>
              </dd>
            ) : null}
          </div>
        </dl>

        <div className="mt-5 border-t border-brand-border pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
            Bericht
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy">
            {row.message}
          </p>
        </div>
      </section>

      <WebSupportActions message={row} canMutate={canMutate} />
    </div>
  );
}
