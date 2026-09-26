import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canReadSupport } from '@/lib/support/types';
import { listSupportMessages } from '@/lib/support/queries';
import { SupportFilters } from '@/components/support/SupportFilters';
import { SupportTicketList } from '@/components/support/SupportTicketList';

export const dynamic = 'force-dynamic';

type SearchParams = {
  status?: string;
  priority?: string;
  category?: string;
  q?: string;
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdmin();
  if (!canReadSupport(admin.profile.role)) {
    throw new ForbiddenAdminError();
  }

  const status = searchParams.status ?? 'open';
  const priority = searchParams.priority ?? 'all';
  const category = searchParams.category ?? 'all';
  const q = searchParams.q ?? '';

  const { rows, error } = await listSupportMessages({
    status,
    priority,
    category,
    q,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Support
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          Inbox voor menselijke supportvragen. Standaard gefilterd op open
          tickets.
        </p>
      </div>

      <SupportFilters
        status={status}
        priority={priority}
        category={category}
        q={q}
      />

      {error ? (
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-brand-accent">
          {rows.length} {rows.length === 1 ? 'vraag' : 'vragen'}
        </p>
      </div>

      <SupportTicketList rows={rows} />
    </div>
  );
}
