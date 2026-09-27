import type { AdminRole } from '@/lib/auth/types';
import { createClient } from '@/lib/supabase/server';
import { canReadSupport } from '@/lib/support/types';

export type NavBadgeCounts = {
  appSupport: number;
  webSupport: number;
};

/**
 * Server-side badge counts. Returns 0 when the role cannot read support
 * or when RPC/tables are missing (pre-migration).
 */
export async function getSupportBadgeCounts(
  role: AdminRole,
): Promise<NavBadgeCounts> {
  if (!canReadSupport(role)) {
    return { appSupport: 0, webSupport: 0 };
  }

  const supabase = await createClient();

  const [appRes, webRes] = await Promise.all([
    supabase.rpc('admin_app_support_badge_count'),
    supabase.rpc('admin_web_support_badge_count'),
  ]);

  let appSupport = 0;
  let webSupport = 0;

  if (appRes.error) {
    console.error('[badges] app count failed:', appRes.error.message);
    // Fallback: open tickets only
    const { count } = await supabase
      .from('support_messages')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_behandeling']);
    appSupport = count ?? 0;
  } else {
    appSupport =
      typeof appRes.data === 'number'
        ? appRes.data
        : Number(appRes.data ?? 0) || 0;
  }

  if (webRes.error) {
    console.error('[badges] web count failed:', webRes.error.message);
    const { count } = await supabase
      .from('website_messages')
      .select('id', { count: 'exact', head: true })
      .in('status', ['nieuw', 'in_behandeling']);
    webSupport = count ?? 0;
  } else {
    webSupport =
      typeof webRes.data === 'number'
        ? webRes.data
        : Number(webRes.data ?? 0) || 0;
  }

  return { appSupport, webSupport };
}
