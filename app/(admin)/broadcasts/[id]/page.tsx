import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import {
  broadcastStatus,
  broadcastStatusLabel,
  canMutateBroadcasts,
  canReadBroadcasts,
} from '@/lib/broadcasts/types';
import { getBroadcastById } from '@/lib/broadcasts/queries';
import { BroadcastForm } from '@/components/broadcasts/BroadcastForm';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function BroadcastDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canReadBroadcasts(admin.profile.role)) throw new ForbiddenAdminError();

  const { row, deliveryCount, error } = await getBroadcastById(params.id);
  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        <Link href="/broadcasts" className="text-sm text-brand-navy">← Terug</Link>
      </div>
    );
  }
  if (!row) notFound();

  const canMutate = canMutateBroadcasts(admin.profile.role);
  const st = broadcastStatus(row);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/broadcasts" className="text-sm text-brand-accent hover:text-brand-navy">
        ← Broadcasts
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">{row.title}</h1>
        <p className="mt-1 text-sm text-brand-accent">
          {broadcastStatusLabel(st)} · gepland {formatSupportDateTime(row.scheduled_for)}
          {row.dispatched_at
            ? ` · verzonden ${formatSupportDateTime(row.dispatched_at)} · ~${deliveryCount} notificaties`
            : null}
        </p>
      </div>
      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <p className="whitespace-pre-wrap text-sm text-brand-navy">{row.message}</p>
        {row.link_url ? (
          <p className="mt-3 text-sm text-brand-accent">
            Link: {row.link_label || 'Lees artikel'} — {row.link_url}
          </p>
        ) : null}
      </section>
      <BroadcastForm mode="edit" initial={row} canMutate={canMutate} />
    </div>
  );
}
