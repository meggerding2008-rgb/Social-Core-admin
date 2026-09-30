'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageBilling } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireUsageMutator() {
  const admin = await requireAdmin();
  if (!canManageBilling(admin.profile.role)) {
    throw new AppError('Alleen superadmins mogen verbruik corrigeren.');
  }
  return admin;
}

function revalidateUsagePaths(userId: string) {
  revalidatePath(`/users/${userId}/usage`);
  revalidatePath(`/users/${userId}`);
}

function parseCount(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError('Aantal moet een niet-negatief getal zijn.');
  }
  return Math.floor(n);
}

export async function correctUserUsage(input: {
  userId: string;
  month?: string;
  postsUsed?: string;
  aiGenerationsUsed?: string;
  reason: string;
  confirm: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireUsageMutator();
    if (!input.confirm) {
      throw new AppError('Bevestig de correctie via het vinkje.');
    }

    const reason = input.reason.trim();
    if (reason.length < 5) {
      throw new AppError('Geef een korte reden (min. 5 tekens).');
    }

    const month = input.month?.trim() || new Date().toISOString().slice(0, 7);
    const postsUsed = parseCount(input.postsUsed);
    const aiGenerationsUsed = parseCount(input.aiGenerationsUsed);

    if (postsUsed === null && aiGenerationsUsed === null) {
      throw new AppError('Vul minstens één te corrigeren waarde in.');
    }

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('usage')
      .select('id, posts_used, ai_generations_used, month')
      .eq('user_id', input.userId)
      .eq('month', month)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError(
        `Geen verbruiksrecord voor ${month}. Alleen bestaande rijen kunnen worden gecorrigeerd.`,
      );
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (postsUsed !== null) patch.posts_used = postsUsed;
    if (aiGenerationsUsed !== null) {
      patch.ai_generations_used = aiGenerationsUsed;
    }

    const { error } = await supabase
      .from('usage')
      .update(patch)
      .eq('id', before.id)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-usage] correct failed:', error.message);
      throw new AppError('Verbruik kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.usage.correction',
      resourceType: 'usage',
      resourceId: before.id,
      beforeState: before,
      afterState: patch,
      metadata: { userId: input.userId, reason, month },
    });

    revalidateUsagePaths(input.userId);
    return { ok: true, message: 'Verbruik gecorrigeerd.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Correctie mislukt.'),
    };
  }
}
