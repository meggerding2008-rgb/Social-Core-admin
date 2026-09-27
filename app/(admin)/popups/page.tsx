import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutatePopups, canReadPopups } from '@/lib/popups/types';
import { listPopups } from '@/lib/popups/queries';
import { PopupFilters } from '@/components/popups/PopupFilters';
import { PopupList } from '@/components/popups/PopupList';

export const dynamic = 'force-dynamic';

export default async function PopupsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; q?: string };
}) {
  const admin = await requireAdmin();
  if (!canReadPopups(admin.profile.role)) throw new ForbiddenAdminError();

  const status = searchParams.status ?? 'all';
  const type = searchParams.type ?? 'all';
  const q = searchParams.q ?? '';
  const { rows, error } = await listPopups({ status, type, q });
  const canMutate = canMutatePopups(admin.profile.role);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
            Pop-ups
          </h1>
          <p className="mt-1 text-sm text-brand-accent">
            In-app meldingen, feedback en enquêtes voor gebruikers.
          </p>
        </div>
        {canMutate ? (
          <Link
            href="/popups/new"
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent"
          >
            Nieuwe pop-up
          </Link>
        ) : null}
      </div>

      <PopupFilters status={status} type={type} q={q} />

      {error ? (
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <p className="text-sm text-brand-accent">
        {rows.length} {rows.length === 1 ? 'pop-up' : 'pop-ups'}
      </p>
      <PopupList rows={rows} />
    </div>
  );
}
