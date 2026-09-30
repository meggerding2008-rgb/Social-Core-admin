import Link from 'next/link';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canViewPosts } from '@/lib/auth/permissions';
import { listScheduledPostsForUser } from '@/lib/user-posts/queries';
import { postStatusLabel } from '@/lib/user-posts/types';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

function monthKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'onbekend';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default async function UserCalendarPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewPosts(admin.profile.role)) throw new ForbiddenAdminError();

  const { rows, error } = await listScheduledPostsForUser(params.id);

  const byMonth = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.scheduled_for) continue;
    const key = monthKey(row.scheduled_for);
    const list = byMonth.get(key) ?? [];
    list.push(row);
    byMonth.set(key, list);
  }

  const months = Array.from(byMonth.keys()).sort();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-navy">Kalender</h2>
          <p className="text-sm text-brand-accent">
            Geplande posts (`scheduled_for`) voor deze gebruiker.
          </p>
        </div>
        <Link
          href={`/users/${params.id}/posts`}
          className="text-sm font-medium text-brand-navy hover:text-brand-accent"
        >
          Alle posts →
        </Link>
      </div>

      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {months.length === 0 ? (
        <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center text-sm text-brand-accent">
          Geen geplande posts.
        </div>
      ) : (
        months.map((month) => (
          <section
            key={month}
            className="rounded-card border border-brand-border bg-brand-white p-5"
          >
            <h3 className="text-sm font-semibold text-brand-navy">{month}</h3>
            <ul className="mt-3 divide-y divide-brand-border">
              {(byMonth.get(month) ?? []).map((row) => (
                <li key={row.id} className="py-3">
                  <Link
                    href={`/users/${params.id}/posts/${row.id}`}
                    className="block hover:bg-brand-mist/50"
                  >
                    <p className="text-sm font-medium text-brand-navy">
                      {row.title || 'Zonder titel'}
                    </p>
                    <p className="text-xs text-brand-accent">
                      {formatSupportDateTime(row.scheduled_for!)} ·{' '}
                      {postStatusLabel(row.status)} ·{' '}
                      {row.platforms?.join(', ') || '—'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
