import Link from 'next/link';

type Props = {
  q?: string;
  plan?: string;
  status?: string;
};

const selectClass =
  'rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function UserFilters({ q, plan, status }: Props) {
  return (
    <form
      method="get"
      className="rounded-card border border-brand-border bg-brand-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-medium text-brand-navy sm:col-span-2">
          Zoeken
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Naam, e-mail of bedrijf…"
            className={`mt-1 w-full ${selectClass}`}
          />
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Abonnement
          <select
            name="plan"
            defaultValue={plan ?? 'all'}
            className={`mt-1 w-full ${selectClass}`}
          >
            <option value="all">Alle</option>
            <option value="silver">Zilver</option>
            <option value="gold">Goud</option>
            <option value="diamond">Diamant</option>
          </select>
        </label>

        <label className="block text-xs font-medium text-brand-navy">
          Accountstatus
          <select
            name="status"
            defaultValue={status ?? 'all'}
            className={`mt-1 w-full ${selectClass}`}
          >
            <option value="all">Alle</option>
            <option value="active">Actief</option>
            <option value="blocked">Geblokkeerd</option>
          </select>
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
          href="/users"
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
