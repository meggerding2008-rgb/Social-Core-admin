import Link from 'next/link';
import { WEBSITE_MESSAGE_STATUSES } from '@/lib/web-support/types';
import { websiteMessageStatusLabel } from '@/lib/web-support/types';

type Props = {
  status?: string;
  q?: string;
};

const selectClass =
  'rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function WebSupportFilters({ status, q }: Props) {
  return (
    <form
      method="get"
      className="rounded-card border border-brand-border bg-brand-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-medium text-brand-navy">
          Status
          <select
            name="status"
            defaultValue={status ?? 'all'}
            className={`mt-1 w-full ${selectClass}`}
          >
            <option value="all">Alle</option>
            {WEBSITE_MESSAGE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {websiteMessageStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-brand-navy sm:col-span-2 lg:col-span-2">
          Zoeken
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Naam, e-mail, onderwerp…"
            className={`mt-1 w-full ${selectClass}`}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent"
        >
          Filters toepassen
        </button>
        <Link
          href="/web-support"
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist"
        >
          Reset (alle)
        </Link>
      </div>
    </form>
  );
}
