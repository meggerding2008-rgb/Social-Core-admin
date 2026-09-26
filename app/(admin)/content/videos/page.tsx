import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canMutateCms, canReadCms } from '@/lib/content/types';
import {
  listVideoCategories,
  listVideoTutorials,
} from '@/lib/content/queries';
import { CmsFilters } from '@/components/content/CmsFilters';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  category?: string;
  published?: string;
};

export default async function VideosListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdmin();
  if (!canReadCms(admin.profile.role)) throw new ForbiddenAdminError();

  const q = searchParams.q ?? '';
  const category = searchParams.category ?? 'all';
  const published = searchParams.published ?? 'all';
  const canMutate = canMutateCms(admin.profile.role);

  const [{ rows, error }, categories] = await Promise.all([
    listVideoTutorials({ q, category, published }),
    listVideoCategories(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/content" className="text-sm text-brand-accent hover:text-brand-navy">
            ← Content
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-brand-navy">
            Videotutorials
          </h1>
        </div>
        {canMutate ? (
          <Link
            href="/content/videos/new"
            className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:bg-brand-accent"
          >
            Nieuwe video
          </Link>
        ) : null}
      </div>

      <CmsFilters
        q={q}
        category={category}
        published={published}
        categories={categories}
        basePath="/content/videos"
      />

      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center text-sm text-brand-accent">
          Geen video’s gevonden.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-card border border-brand-border bg-brand-white divide-y divide-brand-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/content/videos/${row.id}`}
                className="block px-4 py-4 hover:bg-brand-mist/70"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-brand-navy">
                      {row.title}
                    </p>
                    <p className="text-xs text-brand-accent">
                      {row.category || 'Geen categorie'} · {row.duration} ·
                      volgorde {row.display_order}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-brand-accent">
                    <span>
                      {row.is_published ? 'Gepubliceerd' : 'Verborgen'}
                    </span>
                    <span>{formatSupportDateTime(row.updated_at)}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
