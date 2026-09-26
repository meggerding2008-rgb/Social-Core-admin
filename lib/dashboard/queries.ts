import { createClient } from '@/lib/supabase/server';
import { listUsersNeedingReviews } from '@/lib/reviews/queries';

export type DashboardCard = {
  label: string;
  value: number | string;
  href: string;
  hint?: string;
};

export type DashboardAction = {
  id: string;
  title: string;
  meta: string;
  href: string;
  urgency: 'high' | 'medium' | 'low';
};

export type DashboardActivity = {
  id: string;
  label: string;
  meta: string;
  href: string;
  at: string;
};

export type DashboardSystemItem = {
  label: string;
  value: string;
  ok: boolean | null;
};

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'Onbekend / geen data';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Onbekend / geen data';
  return d.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function countOrZero(
  promise: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await promise;
  if (error) {
    console.error('[dashboard] count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

async function latestFrom(
  run: () => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  field: string,
): Promise<string | null> {
  try {
    const { data, error } = await run();
    if (error || !data || typeof data !== 'object') return null;
    const raw = (data as Record<string, unknown>)[field];
    return typeof raw === 'string' ? raw : null;
  } catch {
    return null;
  }
}

export async function getDashboardData(): Promise<{
  cards: DashboardCard[];
  actions: DashboardAction[];
  activity: DashboardActivity[];
  system: DashboardSystemItem[];
}> {
  const supabase = await createClient();
  const monthStart = startOfMonthIso();
  const nowIso = new Date().toISOString();

  const [
    totalUsers,
    newUsersMonth,
    activeSubs,
    openSupport,
    newErrors,
    plannedReviews,
    conceptReviews,
    plannedBroadcasts,
    overdueScheduledReviews,
    dueUsers,
    recentAudit,
    recentErrors,
    lastErrorAt,
    lastMetricsAt,
    lastTrendAt,
    lastPublishedPostAt,
  ] = await Promise.all([
    countOrZero(
      supabase.from('users').select('id', { count: 'exact', head: true }),
    ),
    countOrZero(
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart),
    ),
    countOrZero(
      supabase
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'trialing']),
    ),
    countOrZero(
      supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'in_behandeling']),
    ),
    countOrZero(
      supabase
        .from('error_reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
    ),
    countOrZero(
      supabase
        .from('content_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'gepland'),
    ),
    countOrZero(
      supabase
        .from('content_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'concept'),
    ),
    countOrZero(
      supabase
        .from('broadcast_notifications')
        .select('id', { count: 'exact', head: true })
        .is('dispatched_at', null),
    ),
    countOrZero(
      supabase
        .from('content_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'gepland')
        .lt('scheduled_for', nowIso),
    ),
    listUsersNeedingReviews({ soonDays: 14, limit: 12 }),
    supabase
      .from('admin_audit_logs')
      .select('id, action, resource_type, resource_id, created_at, actor_id')
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('error_reports')
      .select('id, message, severity, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    latestFrom(async () => {
      const supabase = await createClient();
      return supabase
        .from('error_reports')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }, 'created_at'),
    latestFrom(async () => {
      const supabase = await createClient();
      return supabase
        .from('social_account_metrics')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }, 'updated_at'),
    latestFrom(async () => {
      const supabase = await createClient();
      return supabase
        .from('trend_items')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }, 'updated_at'),
    latestFrom(async () => {
      const supabase = await createClient();
      return supabase
        .from('posts')
        .select('published_at')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    }, 'published_at'),
  ]);

  const cards: DashboardCard[] = [
    {
      label: 'Totaal gebruikers',
      value: totalUsers,
      href: '/users',
    },
    {
      label: 'Nieuw deze maand',
      value: newUsersMonth,
      href: '/users',
    },
    {
      label: 'Actieve abonnementen',
      value: activeSubs,
      href: '/users?plan=all',
    },
    {
      label: 'Open support',
      value: openSupport,
      href: '/support?status=open',
    },
    {
      label: 'Nieuwe fouten',
      value: newErrors,
      href: '/errors?status=open',
    },
    {
      label: 'Reviews gepland',
      value: plannedReviews,
      href: '/reviews?status=gepland',
    },
    {
      label: 'Reviews te maken',
      value: dueUsers.filter((u) => u.overdue).length,
      href: '/reviews',
      hint: `${dueUsers.length} overdue of binnen 14 dagen`,
    },
    {
      label: 'Broadcasts open',
      value: plannedBroadcasts,
      href: '/broadcasts?status=pending',
    },
  ];

  const actions: DashboardAction[] = [];

  const { data: supportRows } = await supabase
    .from('support_messages')
    .select('id, subject, status, created_at')
    .in('status', ['open', 'in_behandeling'])
    .order('created_at', { ascending: true })
    .limit(5);

  for (const row of supportRows ?? []) {
    const r = row as {
      id: string;
      subject?: string | null;
      status: string;
      created_at: string;
    };
    actions.push({
      id: `support-${r.id}`,
      title: r.subject?.trim() || 'Open supportvraag',
      meta: `Status: ${r.status}`,
      href: `/support/${r.id}`,
      urgency: 'high',
    });
  }

  for (const err of recentErrors.data ?? []) {
    const r = err as {
      id: string;
      message: string;
      severity: string;
      status: string;
    };
    if (r.status !== 'open' && r.severity !== 'critical') continue;
    actions.push({
      id: `error-${r.id}`,
      title: r.message.slice(0, 80),
      meta: `Fout · ${r.severity}`,
      href: `/errors/${r.id}`,
      urgency: r.severity === 'critical' ? 'high' : 'medium',
    });
  }

  for (const u of dueUsers.slice(0, 6)) {
    actions.push({
      id: `due-${u.userId}`,
      title: `Review voor ${u.label}`,
      meta: `${u.frequencyLabel} · ${u.overdue ? 'achterstallig' : 'binnenkort'}`,
      href: `/reviews/new?userId=${u.userId}`,
      urgency: u.overdue ? 'high' : 'medium',
    });
  }

  if (overdueScheduledReviews > 0) {
    actions.push({
      id: 'overdue-scheduled-reviews',
      title: `${overdueScheduledReviews} geplande review(s) met verstreken verzenddatum`,
      meta: 'Status nog gepland',
      href: '/reviews?status=gepland',
      urgency: 'high',
    });
  }

  if (conceptReviews > 0) {
    actions.push({
      id: 'concepts',
      title: `${conceptReviews} contentreview(s) als concept`,
      meta: 'Nog niet gepland of verzonden',
      href: '/reviews?status=concept',
      urgency: 'low',
    });
  }

  const { data: pendingBroadcasts } = await supabase
    .from('broadcast_notifications')
    .select('id, title, scheduled_for, dispatched_at')
    .is('dispatched_at', null)
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(5);

  for (const b of pendingBroadcasts ?? []) {
    const row = b as { id: string; title: string; scheduled_for: string };
    actions.push({
      id: `bc-${row.id}`,
      title: `Broadcast wacht op dispatcher: ${row.title}`,
      meta: `Gepland ${formatWhen(row.scheduled_for)}`,
      href: `/broadcasts/${row.id}`,
      urgency: 'medium',
    });
  }

  const activity: DashboardActivity[] = [];
  for (const log of recentAudit.data ?? []) {
    const row = log as {
      id: string;
      action: string;
      resource_type: string;
      resource_id: string | null;
      created_at: string;
    };
    activity.push({
      id: row.id,
      label: auditLabel(row.action),
      meta: `${row.resource_type}${row.resource_id ? ` · ${row.resource_id.slice(0, 8)}` : ''}`,
      href: activityHref(row.action, row.resource_type, row.resource_id),
      at: row.created_at,
    });
  }

  const system: DashboardSystemItem[] = [
    {
      label: 'Laatste foutmelding',
      value: formatWhen(lastErrorAt),
      ok: lastErrorAt ? true : null,
    },
    {
      label: 'Laatste statistiek-sync (social_account_metrics)',
      value: formatWhen(lastMetricsAt),
      ok: lastMetricsAt ? ageOk(lastMetricsAt, 48) : null,
    },
    {
      label: 'Laatste trends-sync (trend_items)',
      value: formatWhen(lastTrendAt),
      ok: lastTrendAt ? ageOk(lastTrendAt, 48) : null,
    },
    {
      label: 'Laatste gepubliceerde post',
      value: formatWhen(lastPublishedPostAt),
      ok: lastPublishedPostAt ? true : null,
    },
    {
      label: 'Open fouten',
      value: String(newErrors),
      ok: newErrors === 0,
    },
  ];

  return { cards, actions, activity, system };
}

function ageOk(iso: string, maxHours: number): boolean {
  const age = Date.now() - new Date(iso).getTime();
  return age <= maxHours * 60 * 60 * 1000;
}

function auditLabel(action: string): string {
  if (action.includes('user') && action.includes('create')) return 'Nieuwe gebruiker (audit)';
  if (action.startsWith('support')) return 'Supportactie';
  if (action.includes('error_report')) return 'Foutmelding bijgewerkt';
  if (action.includes('content_review') && action.includes('create')) {
    return 'Review aangemaakt';
  }
  if (action.includes('content_review') && action.includes('status')) {
    return 'Reviewstatus gewijzigd';
  }
  if (action.includes('content_review')) return 'Review bijgewerkt';
  if (action.includes('broadcast')) return 'Broadcastactie';
  if (action.includes('admin')) return 'Adminwijziging';
  return action;
}

function activityHref(
  action: string,
  resourceType: string,
  resourceId: string | null,
): string {
  if (!resourceId) {
    if (resourceType.includes('support')) return '/support';
    if (resourceType.includes('error')) return '/errors';
    if (resourceType.includes('review')) return '/reviews';
    if (resourceType.includes('broadcast')) return '/broadcasts';
    if (resourceType.includes('admin')) return '/admins';
    return '/audit';
  }
  if (resourceType.includes('support')) return `/support/${resourceId}`;
  if (resourceType.includes('error')) return `/errors/${resourceId}`;
  if (resourceType.includes('content_review') || resourceType.includes('review')) {
    return `/reviews/${resourceId}`;
  }
  if (resourceType.includes('broadcast')) return `/broadcasts/${resourceId}`;
  if (resourceType.includes('admin')) return `/admins/${resourceId}`;
  if (resourceType.includes('user') || action.includes('user')) {
    return `/users/${resourceId}`;
  }
  return '/audit';
}
