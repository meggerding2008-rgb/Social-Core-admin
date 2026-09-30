'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManagePosts } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

async function requirePostMutator() {
  const admin = await requireAdmin();
  if (!canManagePosts(admin.profile.role)) {
    throw new AppError('Je hebt geen rechten om posts te beheren.');
  }
  return admin;
}

function revalidatePostPaths(userId: string, postId?: string) {
  revalidatePath(`/users/${userId}`);
  revalidatePath(`/users/${userId}/posts`);
  revalidatePath(`/users/${userId}/calendar`);
  revalidatePath('/dashboard');
  if (postId) revalidatePath(`/users/${userId}/posts/${postId}`);
}

function parsePlatforms(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

function localDateTimeToIso(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function createUserPost(input: {
  userId: string;
  title: string;
  description: string;
  platforms: string;
  hashtags?: string;
  scheduledFor?: string;
  status?: string;
  skipValidationReason?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requirePostMutator();
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title && !description) {
      throw new AppError('Titel of tekst is verplicht.');
    }

    const platforms = parsePlatforms(input.platforms);
    const status = input.status?.trim() || 'concept';
    const scheduledFor = localDateTimeToIso(input.scheduledFor);
    const now = new Date().toISOString();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: input.userId,
        title: title || null,
        description: description || null,
        platforms,
        hashtags: input.hashtags?.trim() || null,
        status,
        scheduled_for: scheduledFor,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[user-posts] create failed:', error?.message);
      throw new AppError(
        'Post kon niet worden aangemaakt. Controleer RLS-migratie 20260929_user_admin_manage_rls.sql.',
      );
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.post.create',
      resourceType: 'posts',
      resourceId: data.id,
      afterState: {
        user_id: input.userId,
        title,
        status,
        platforms,
        scheduled_for: scheduledFor,
      },
      metadata: {
        skipValidationReason: input.skipValidationReason?.trim() || null,
      },
    });

    revalidatePostPaths(input.userId, data.id);
    return { ok: true, id: data.id, message: 'Post aangemaakt.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Post kon niet worden aangemaakt.'),
    };
  }
}

export async function updateUserPost(input: {
  userId: string;
  postId: string;
  title: string;
  description: string;
  platforms: string;
  hashtags?: string;
  scheduledFor?: string | null;
  status?: string;
  imageUrl?: string | null;
  skipValidationReason?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requirePostMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('posts')
      .select('id, user_id, title, description, platforms, status, hashtags, scheduled_for, image_url')
      .eq('id', input.postId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Post niet gevonden voor deze gebruiker.');
    }

    const patch = {
      title: input.title.trim() || null,
      description: input.description.trim() || null,
      platforms: parsePlatforms(input.platforms),
      hashtags: input.hashtags?.trim() || null,
      scheduled_for:
        input.scheduledFor === null || input.scheduledFor === undefined
          ? null
          : localDateTimeToIso(input.scheduledFor),
      status: input.status?.trim() || before.status,
      image_url:
        input.imageUrl === undefined
          ? before.image_url
          : input.imageUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('posts')
      .update(patch)
      .eq('id', input.postId)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-posts] update failed:', error.message);
      throw new AppError('Post kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.post.update',
      resourceType: 'posts',
      resourceId: input.postId,
      beforeState: before,
      afterState: patch,
      metadata: {
        userId: input.userId,
        skipValidationReason: input.skipValidationReason?.trim() || null,
      },
    });

    revalidatePostPaths(input.userId, input.postId);
    return { ok: true, message: 'Post opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Post kon niet worden bijgewerkt.'),
    };
  }
}

export async function setUserPostStatus(input: {
  userId: string;
  postId: string;
  status: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requirePostMutator();
    const status = input.status.trim();
    if (!status) throw new AppError('Status is verplicht.');

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('posts')
      .select('id, status')
      .eq('id', input.postId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Post niet gevonden voor deze gebruiker.');
    }

    const { error } = await supabase
      .from('posts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', input.postId)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-posts] status failed:', error.message);
      throw new AppError('Status kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.post.status',
      resourceType: 'posts',
      resourceId: input.postId,
      beforeState: before,
      afterState: { status },
      metadata: { userId: input.userId, reason: input.reason?.trim() || null },
    });

    revalidatePostPaths(input.userId, input.postId);
    return { ok: true, message: `Status: ${status}` };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Status kon niet worden bijgewerkt.'),
    };
  }
}

export async function duplicateUserPost(input: {
  userId: string;
  postId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requirePostMutator();
    const supabase = await createClient();
    const { data: source, error } = await supabase
      .from('posts')
      .select(
        'title, description, image_url, platforms, hashtags, user_id',
      )
      .eq('id', input.postId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (error || !source) {
      throw new AppError('Bronpost niet gevonden.');
    }

    const now = new Date().toISOString();
    const { data: created, error: insertError } = await supabase
      .from('posts')
      .insert({
        user_id: input.userId,
        title: source.title ? `${source.title} (kopie)` : 'Kopie',
        description: source.description,
        image_url: source.image_url,
        platforms: source.platforms,
        hashtags: source.hashtags,
        status: 'concept',
        scheduled_for: null,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (insertError || !created) {
      console.error('[user-posts] duplicate failed:', insertError?.message);
      throw new AppError('Dupliceren mislukt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.post.duplicate',
      resourceType: 'posts',
      resourceId: created.id,
      afterState: { source_id: input.postId, user_id: input.userId },
    });

    revalidatePostPaths(input.userId, created.id);
    return { ok: true, id: created.id, message: 'Post gedupliceerd als concept.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Dupliceren mislukt.'),
    };
  }
}

export async function archiveUserPost(input: {
  userId: string;
  postId: string;
}): Promise<ActionResult> {
  return setUserPostStatus({
    userId: input.userId,
    postId: input.postId,
    status: 'gearchiveerd',
    reason: 'Gearchiveerd via admin',
  });
}

export async function clearPostPublishErrors(input: {
  userId: string;
  postId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requirePostMutator();
    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('posts')
      .select(
        'id, facebook_publish_error, instagram_publish_error, threads_publish_error, x_publish_error, linkedin_publish_error, status',
      )
      .eq('id', input.postId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Post niet gevonden.');
    }

    const { error } = await supabase
      .from('posts')
      .update({
        facebook_publish_error: null,
        instagram_publish_error: null,
        threads_publish_error: null,
        x_publish_error: null,
        linkedin_publish_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.postId)
      .eq('user_id', input.userId);

    if (error) {
      throw new AppError('Publicatiefouten konden niet worden gewist.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.post.clear_publish_errors',
      resourceType: 'posts',
      resourceId: input.postId,
      beforeState: before,
      metadata: { userId: input.userId },
    });

    revalidatePostPaths(input.userId, input.postId);
    return {
      ok: true,
      message:
        'Fouten gewist. Opnieuw publiceren gebeurt via de gebruikersapp-workflow indien beschikbaar.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Fouten wissen mislukt.'),
    };
  }
}
