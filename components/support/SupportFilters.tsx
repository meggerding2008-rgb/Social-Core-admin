import Link from 'next/link';
import {
  SUPPORT_CATEGORIES,
  SUPPORT_MESSAGE_STATUSES,
} from '@/lib/support/types';
import { getSupportStatusLabel } from '@/lib/support/labels';

type Props = {
  status?: string;
  priority?: string;
  category?: string;
  q?: string;
};

const selectClass =
  'rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function SupportFilters({ status, priority, category, q }: Props) {
  return (
    <form
      method="get"
      className="rounded-card border border-brand-border bg-brand-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-xs font-medium text-brand-navy">
          Status
          <select
            name="status"
            defaultValue={status ?? 'open'}
            className={`mt-1 w-full ${selectClass}`}
          >
            <option value="all">Alle</option>
            {SUPPORT_MESSAGE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {getSupportStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Prioriteit
          <select
            name="priority"
            defaultValue={priority ?? 'all'}
            className={`mt-1 w-full ${selectClass}`}
          >
            <option value="all">Alle</option>
            <option value="high">Prioriteit</option>
            <option value="normal">Normaal</option>
          </select>
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Categorie
          <select
            name="category"
            defaultValue={category ?? 'all'}
            className={`mt-1 w-full ${selectClass}`}
          >
            <option value="all">Alle</option>
            {SUPPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
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
            placeholder="Onderwerp, bericht, gebruiker…"
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
          href="/support?status=open"
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist"
        >
          Reset naar open
        </Link>
      </div>
    </form>
  );
}
