'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import {
  canMutateCms,
  isValidHttpUrl,
  isValidVideoUrl,
  sanitizePlainText,
} from '@/lib/content/types';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

async function requireCmsMutator() {
  const admin = await requireAdmin();
  if (!canMutateCms(admin.profile.role)) {
    throw new AppError('Alleen content-admins en superadmins mogen CMS wijzigen.');
  }
  return admin;
}

function revalidateCms() {
  revalidatePath('/content');
  revalidatePath('/content/faq');
  revalidatePath('/content/videos');
}

export async function createFaqItem(input: {
  question: string;
  answer: string;
  category?: string;
  displayOrder: number;
  isPublished: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireCmsMutator();
    const question = sanitizePlainText(input.question, 500);
    const answer = sanitizePlainText(input.answer, 20000);
    const category = sanitizePlainText(input.category ?? '', 120) || null;

    if (!question) throw new AppError('Vraag is verplicht.');
    if (!answer) throw new AppError('Antwoord is verplicht.');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('faq_items')
      .insert({
        question,
        answer,
        category,
        display_order: Number.isFinite(input.displayOrder) ? input.displayOrder : 0,
        is_published: Boolean(input.isPublished),
      })
      .select('id, question, is_published, display_order')
      .single();

    if (error) {
      console.error('[cms] faq create failed:', error.message);
      throw new AppError('FAQ kon niet worden aangemaakt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'cms.faq.create',
      resourceType: 'faq_items',
      resourceId: data.id,
      afterState: data,
    });

    revalidateCms();
    revalidatePath(`/content/faq/${data.id}`);
    return { ok: true, id: data.id, message: 'FAQ aangemaakt.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'FAQ kon niet worden aangemaakt.'),
    };
  }
}

export async function updateFaqItem(input: {
  id: string;
  question: string;
  answer: string;
  category?: string;
  displayOrder: number;
  isPublished: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireCmsMutator();
    const question = sanitizePlainText(input.question, 500);
    const answer = sanitizePlainText(input.answer, 20000);
    const category = sanitizePlainText(input.category ?? '', 120) || null;

    if (!question) throw new AppError('Vraag is verplicht.');
    if (!answer) throw new AppError('Antwoord is verplicht.');

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('faq_items')
      .select('id, question, answer, category, display_order, is_published')
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) throw new AppError('FAQ niet gevonden.');

    const updates = {
      question,
      answer,
      category,
      display_order: Number.isFinite(input.displayOrder) ? input.displayOrder : 0,
      is_published: Boolean(input.isPublished),
    };

    const { error } = await supabase
      .from('faq_items')
      .update(updates)
      .eq('id', input.id);

    if (error) {
      console.error('[cms] faq update failed:', error.message);
      throw new AppError('FAQ kon niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'cms.faq.update',
      resourceType: 'faq_items',
      resourceId: input.id,
      beforeState: before,
      afterState: updates,
    });

    revalidateCms();
    revalidatePath(`/content/faq/${input.id}`);
    return { ok: true, id: input.id, message: 'FAQ opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'FAQ kon niet worden opgeslagen.'),
    };
  }
}

export async function createVideoTutorial(input: {
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  description?: string;
  category?: string;
  displayOrder: number;
  isPublished: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireCmsMutator();
    const title = sanitizePlainText(input.title, 200);
    const videoUrl = sanitizePlainText(input.videoUrl, 2000);
    const thumbnailUrl = sanitizePlainText(input.thumbnailUrl, 2000);
    const duration = sanitizePlainText(input.duration, 40);
    const description = sanitizePlainText(input.description ?? '', 5000) || null;
    const category = sanitizePlainText(input.category ?? '', 120) || null;

    if (!title) throw new AppError('Titel is verplicht.');
    if (!isValidVideoUrl(videoUrl)) {
      throw new AppError('Ongeldige video-URL (gebruik http/https).');
    }
    if (!isValidHttpUrl(thumbnailUrl)) {
      throw new AppError('Ongeldige thumbnail-URL (gebruik http/https).');
    }
    if (!duration) throw new AppError('Duur is verplicht (bijv. 3:20).');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('video_tutorials')
      .insert({
        title,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration,
        description,
        category,
        display_order: Number.isFinite(input.displayOrder) ? input.displayOrder : 0,
        is_published: Boolean(input.isPublished),
      })
      .select('id, title, is_published, display_order')
      .single();

    if (error) {
      console.error('[cms] video create failed:', error.message);
      throw new AppError('Video kon niet worden aangemaakt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'cms.video.create',
      resourceType: 'video_tutorials',
      resourceId: data.id,
      afterState: data,
    });

    revalidateCms();
    revalidatePath(`/content/videos/${data.id}`);
    return { ok: true, id: data.id, message: 'Video aangemaakt.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Video kon niet worden aangemaakt.'),
    };
  }
}

export async function updateVideoTutorial(input: {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  description?: string;
  category?: string;
  displayOrder: number;
  isPublished: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireCmsMutator();
    const title = sanitizePlainText(input.title, 200);
    const videoUrl = sanitizePlainText(input.videoUrl, 2000);
    const thumbnailUrl = sanitizePlainText(input.thumbnailUrl, 2000);
    const duration = sanitizePlainText(input.duration, 40);
    const description = sanitizePlainText(input.description ?? '', 5000) || null;
    const category = sanitizePlainText(input.category ?? '', 120) || null;

    if (!title) throw new AppError('Titel is verplicht.');
    if (!isValidVideoUrl(videoUrl)) {
      throw new AppError('Ongeldige video-URL (gebruik http/https).');
    }
    if (!isValidHttpUrl(thumbnailUrl)) {
      throw new AppError('Ongeldige thumbnail-URL (gebruik http/https).');
    }
    if (!duration) throw new AppError('Duur is verplicht.');

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('video_tutorials')
      .select(
        'id, title, video_url, thumbnail_url, duration, description, category, display_order, is_published',
      )
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) throw new AppError('Video niet gevonden.');

    const updates = {
      title,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration,
      description,
      category,
      display_order: Number.isFinite(input.displayOrder) ? input.displayOrder : 0,
      is_published: Boolean(input.isPublished),
    };

    const { error } = await supabase
      .from('video_tutorials')
      .update(updates)
      .eq('id', input.id);

    if (error) {
      console.error('[cms] video update failed:', error.message);
      throw new AppError('Video kon niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'cms.video.update',
      resourceType: 'video_tutorials',
      resourceId: input.id,
      beforeState: before,
      afterState: updates,
    });

    revalidateCms();
    revalidatePath(`/content/videos/${input.id}`);
    return { ok: true, id: input.id, message: 'Video opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Video kon niet worden opgeslagen.'),
    };
  }
}
