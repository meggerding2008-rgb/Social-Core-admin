import type { AdminRole } from '@/lib/auth/types';

export type BroadcastRow = {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  link_label: string | null;
  scheduled_for: string;
  dispatched_at: string | null;
  created_at: string;
  delivery_count?: number;
};

export function canReadBroadcasts(role: AdminRole): boolean {
  return (
    role === 'superadmin' ||
    role === 'support' ||
    role === 'content' ||
    role === 'viewer'
  );
}

export function canMutateBroadcasts(role: AdminRole): boolean {
  return role === 'superadmin';
}

export function broadcastStatus(
  row: Pick<BroadcastRow, 'dispatched_at' | 'scheduled_for'>,
): 'verzonden' | 'gepland' | 'wachtend' {
  if (row.dispatched_at) return 'verzonden';
  if (new Date(row.scheduled_for).getTime() > Date.now()) return 'gepland';
  return 'wachtend';
}

export function broadcastStatusLabel(
  status: ReturnType<typeof broadcastStatus>,
): string {
  switch (status) {
    case 'verzonden':
      return 'Verzonden';
    case 'gepland':
      return 'Gepland';
    case 'wachtend':
      return 'Wacht op dispatcher';
  }
}
