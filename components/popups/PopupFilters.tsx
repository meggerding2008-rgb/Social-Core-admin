import Link from 'next/link';
import {
  POPUP_STATUSES,
  POPUP_TYPES,
  popupStatusLabel,
  popupTypeLabel,
} from '@/lib/popups/types';

type Props = {
  status?: string;
  type?: string;
  q?: string;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function PopupFilters({ status, type, q }: Props) {
  return (
    <form
      method="get"
      className="rounded-card border border-brand-border bg-brand-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-medium text-brand-navy">
          Status
          <select name="status" defaultValue={status ?? 'all'} className={field}>
            <option value="all">Alle</option>
            {POPUP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {popupStatusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Type
          <select name="type" defaultValue={type ?? 'all'} className={field}>
            <option value="all">Alle</option>
            {POPUP_TYPES.map((t) => (
              <option key={t} value={t}>
                {popupTypeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Zoeken
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Titel of inhoud…"
            className={field}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent"
        >
          Filters
        </button>
        <Link
          href="/popups"
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm text-brand-navy hover:bg-brand-mist"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
