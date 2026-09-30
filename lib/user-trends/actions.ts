'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageTrends } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { TREND_STATUSES, type TrendStatus } from '@/lib/user-trends/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireTrendMutator() {
  const admin = await requireAdmin();
  if (!canManageTrends(admin.profile.role)) {
    throw new AppError('Je hebt geen rechten om trends te beheren.');
  }
  return admin;
}

function revalidateTrendPaths(userId: string) {
  revalidatePath(`/users/${userId}/trends`);
  revalidatePath(`/users/${userId}`);
}

export async function updateTrendStatus(input: {
  userId: string;
  trendId: string;
  status: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireTrendMutator();
    const status = input.status.trim() as TrendStatus;
    if (!TREND_STATUSES.includes(status)) {
      throw new AppError('Ongeldige trendstatus.');
    }

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('trend_items')
      .select('id, user_id, status, title')
      .eq('id', input.trendId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Trend niet gevonden voor deze gebruiker.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('trend_items')
      .update({ status, lifecycle_stage: status, updated_at: now })
      .eq('id', input.trendId)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-trends] status failed:', error.message);
      throw new AppError('Status kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.trend.status',
      resourceType: 'trend_items',
      resourceId: input.trendId,
      beforeState: before,
      afterState: { status },
      metadata: {
        userId: input.userId,
        reason: input.reason?.trim() || null,
      },
    });

    revalidateTrendPaths(input.userId);
    return { ok: true, message: `Status: ${status}` };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Status kon niet worden bijgewerkt.'),
    };
  }
}
