import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canReadSupport } from '@/lib/support/types';
import { listWebsiteMessages } from '@/lib/web-support/queries';
import { WebSupportFilters } from '@/components/web-support/WebSupportFilters';
import { WebSupportList } from '@/components/web-support/WebSupportList';

export const dynamic = 'force-dynamic';

type SearchParams = {
  status?: string;
  q?: string;
};

export default async function WebSupportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdmin();
  if (!canReadSupport(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const status = searchParams.status ?? 'all';
  const q = searchParams.q ?? '';

  const { rows, error } = await listWebsiteMessages({ status, q });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Web support
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          Berichten via de Social Core-website / Base44. Gescheiden van App
          support.
        </p>
      </div>

      <WebSupportFilters status={status} q={q} />

      {error ? (
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <p className="text-sm text-brand-accent">
        {rows.length} {rows.length === 1 ? 'bericht' : 'berichten'}
      </p>

      <WebSupportList rows={rows} />
    </div>
  );
}
