'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageSettings } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import type { ContentSettingsPatch } from '@/lib/user-settings/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireSettingsMutator() {
  const admin = await requireAdmin();
  if (!canManageSettings(admin.profile.role)) {
    throw new AppError('Alleen superadmins mogen contentinstellingen wijzigen.');
  }
  return admin;
}

function revalidateSettingsPaths(userId: string) {
  revalidatePath(`/users/${userId}`);
  revalidatePath(`/users/${userId}/system-settings`);
  revalidatePath(`/users/${userId}/profile-settings`);
}

const ALLOWED_KEYS = [
  'brand_name',
  'brand_description',
  'brand_voice',
  'target_audience',
  'scheduling_mode',
  'generation_timezone',
] as const;

function buildSettingsPatch(input: ContentSettingsPatch): Record<string, string | null> {
  const patch: Record<string, string | null> = {};
  for (const key of ALLOWED_KEYS) {
    if (input[key] === undefined) continue;
    const value = input[key]?.trim() ?? '';
    patch[key] = value || null;
  }
  return patch;
}

export async function updateContentSettings(input: {
  userId: string;
  patch: ContentSettingsPatch;
}): Promise<ActionResult> {
  try {
    const admin = await requireSettingsMutator();
    const updates = buildSettingsPatch(input.patch);
    if (Object.keys(updates).length === 0) {
      throw new AppError('Geen wijzigingen om op te slaan.');
    }

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('content_settings')
      .select(ALLOWED_KEYS.join(', '))
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError) {
      console.error('[user-settings] before failed:', beforeError.message);
      throw new AppError('Contentinstellingen niet gevonden voor deze gebruiker.');
    }
    if (!before) {
      throw new AppError(
        'Geen content_settings-rij voor deze gebruiker. Aanmaken gebeurt in de gebruikersapp.',
      );
    }

    const { error } = await supabase
      .from('content_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-settings] update failed:', error.message);
      throw new AppError('Contentinstellingen konden niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.content_settings.update',
      resourceType: 'content_settings',
      resourceId: input.userId,
      beforeState: before,
      afterState: updates,
    });

    revalidateSettingsPaths(input.userId);
    return { ok: true, message: 'Contentinstellingen opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Opslaan mislukt.'),
    };
  }
}
