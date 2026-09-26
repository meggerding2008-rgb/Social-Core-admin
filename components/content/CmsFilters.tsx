import Link from 'next/link';

type Props = {
  q?: string;
  category?: string;
  published?: string;
  categories: string[];
  basePath: string;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function CmsFilters({
  q,
  category,
  published,
  categories,
  basePath,
}: Props) {
  return (
    <form
      method="get"
      className="rounded-card border border-brand-border bg-brand-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-medium text-brand-navy">
          Zoeken
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            className={field}
            placeholder="Zoeken…"
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Categorie
          <select
            name="category"
            defaultValue={category ?? 'all'}
            className={field}
          >
            <option value="all">Alle</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Publicatie
          <select
            name="published"
            defaultValue={published ?? 'all'}
            className={field}
          >
            <option value="all">Alle</option>
            <option value="yes">Gepubliceerd</option>
            <option value="no">Verborgen</option>
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
          href={basePath}
          className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
