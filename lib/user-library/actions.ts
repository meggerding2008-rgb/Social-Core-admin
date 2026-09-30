'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageLibrary } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import {
  MEDIA_ACTIVE_FALLBACK,
  MEDIA_ACTIVE_STATUS,
  MEDIA_ARCHIVED_STATUS,
} from '@/lib/user-library/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireLibraryMutator() {
  const admin = await requireAdmin();
  if (!canManageLibrary(admin.profile.role)) {
    throw new AppError('Je hebt geen rechten om mediabestanden te beheren.');
  }
  return admin;
}

function revalidateLibraryPaths(userId: string) {
  revalidatePath(`/users/${userId}`);
  revalidatePath(`/users/${userId}/library`);
}

function restoreStatusFromBefore(before: unknown): string {
  if (!before || typeof before !== 'object') return MEDIA_ACTIVE_STATUS;
  const vs = (before as Record<string, unknown>).variant_status;
  if (typeof vs === 'string' && vs !== MEDIA_ARCHIVED_STATUS) return vs;
  return MEDIA_ACTIVE_STATUS;
}

export async function archiveMedia(input: {
  userId: string;
  mediaId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireLibraryMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('post_media_assets')
      .select('id, user_id, variant_status, storage_path, public_url')
      .eq('id', input.mediaId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Media-item niet gevonden.');
    }

    const { error } = await supabase
      .from('post_media_assets')
      .update({
        variant_status: MEDIA_ARCHIVED_STATUS,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.mediaId)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-library] archive failed:', error.message);
      throw new AppError('Archiveren mislukt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.media.archive',
      resourceType: 'post_media_assets',
      resourceId: input.mediaId,
      beforeState: before,
      afterState: { variant_status: MEDIA_ARCHIVED_STATUS },
      metadata: { userId: input.userId },
    });

    revalidateLibraryPaths(input.userId);
    return {
      ok: true,
      message: 'Media gearchiveerd (soft). Storage blijft intact.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Archiveren mislukt.'),
    };
  }
}

export async function restoreMedia(input: {
  userId: string;
  mediaId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireLibraryMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('post_media_assets')
      .select('id, user_id, variant_status')
      .eq('id', input.mediaId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Media-item niet gevonden.');
    }

    let nextStatus = restoreStatusFromBefore(before);
    if (nextStatus === MEDIA_ARCHIVED_STATUS) {
      nextStatus = MEDIA_ACTIVE_STATUS;
    }

    const { error } = await supabase
      .from('post_media_assets')
      .update({
        variant_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.mediaId)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-library] restore failed:', error.message);
      if (error.message.includes('variant_status')) {
        const { error: fallbackError } = await supabase
          .from('post_media_assets')
          .update({
            variant_status: MEDIA_ACTIVE_FALLBACK,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.mediaId)
          .eq('user_id', input.userId);
        if (fallbackError) throw new AppError('Herstellen mislukt.');
        nextStatus = MEDIA_ACTIVE_FALLBACK;
      } else {
        throw new AppError('Herstellen mislukt.');
      }
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.media.restore',
      resourceType: 'post_media_assets',
      resourceId: input.mediaId,
      beforeState: before,
      afterState: { variant_status: nextStatus },
      metadata: { userId: input.userId },
    });

    revalidateLibraryPaths(input.userId);
    return { ok: true, message: 'Media hersteld.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Herstellen mislukt.'),
    };
  }
}
