import Link from 'next/link';
import { REVIEW_STATUSES, reviewStatusLabel } from '@/lib/reviews/types';
import { PLAN_FILTERS, planLabel } from '@/lib/users/types';

type Props = {
  status?: string;
  userId?: string;
  tier?: string;
  from?: string;
  to?: string;
  q?: string;
  users: { id: string; label: string }[];
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function ReviewFilters({
  status,
  userId,
  tier,
  from,
  to,
  q,
  users,
}: Props) {
  return (
    <form
      method="get"
      className="rounded-card border border-brand-border bg-brand-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-medium text-brand-navy">
          Status
          <select name="status" defaultValue={status ?? 'all'} className={field}>
            <option value="all">Alle</option>
            {REVIEW_STATUSES.map((value) => (
              <option key={value} value={value}>
                {reviewStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Abonnement
          <select name="tier" defaultValue={tier ?? 'all'} className={field}>
            {PLAN_FILTERS.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'Alle' : planLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Gebruiker
          <select name="userId" defaultValue={userId ?? ''} className={field}>
            <option value="">Alle gebruikers</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-brand-navy sm:col-span-2 lg:col-span-1">
          Zoeken
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Titel, samenvatting, gebruiker…"
            className={field}
          />
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Verzenddatum vanaf
          <input type="date" name="from" defaultValue={from ?? ''} className={field} />
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Verzenddatum tot
          <input type="date" name="to" defaultValue={to ?? ''} className={field} />
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
          href="/reviews"
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
