'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageCompetitors } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

async function requireCompetitorMutator() {
  const admin = await requireAdmin();
  if (!canManageCompetitors(admin.profile.role)) {
    throw new AppError('Je hebt geen rechten om concurrenten te beheren.');
  }
  return admin;
}

function revalidateCompetitorPaths(userId: string) {
  revalidatePath(`/users/${userId}/competitors`);
  revalidatePath(`/users/${userId}`);
}

function parseOptionalNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export async function createUserCompetitor(input: {
  userId: string;
  name: string;
  websiteUrl?: string;
  industry?: string;
  description?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  pinterestUrl?: string;
  xUrl?: string;
  followers?: string;
  engagementRate?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireCompetitorMutator();
    const label = input.name.trim();
    if (!label) throw new AppError('Naam is verplicht.');

    const now = new Date().toISOString();
    const payload = {
      user_id: input.userId,
      competitor_name: label,
      name: label,
      website_url: input.websiteUrl?.trim() || null,
      industry: input.industry?.trim() || null,
      description: input.description?.trim() || null,
      instagram_url: input.instagramUrl?.trim() || null,
      facebook_url: input.facebookUrl?.trim() || null,
      linkedin_url: input.linkedinUrl?.trim() || null,
      pinterest_url: input.pinterestUrl?.trim() || null,
      x_url: input.xUrl?.trim() || null,
      followers: parseOptionalNumber(input.followers, 0),
      engagement_rate: parseOptionalNumber(input.engagementRate, 0),
      posts_per_week: 0,
      growth_rate: 0,
      top_content_type: '',
      best_posting_time: '',
      analysis_status: 'pending',
      created_at: now,
      updated_at: now,
    };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('competitor_data')
      .insert(payload)
      .select('id')
      .single();

    if (error || !data) {
      console.error('[user-competitors] create failed:', error?.message);
      throw new AppError('Concurrent kon niet worden toegevoegd.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.competitor.create',
      resourceType: 'competitor_data',
      resourceId: data.id,
      afterState: { user_id: input.userId, name: label },
    });

    revalidateCompetitorPaths(input.userId);
    return { ok: true, id: data.id, message: 'Concurrent toegevoegd.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Toevoegen mislukt.'),
    };
  }
}

export async function updateUserCompetitor(input: {
  userId: string;
  competitorId: string;
  name: string;
  websiteUrl?: string;
  industry?: string;
  description?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  pinterestUrl?: string;
  xUrl?: string;
  followers?: string;
  engagementRate?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireCompetitorMutator();
    const label = input.name.trim();
    if (!label) throw new AppError('Naam is verplicht.');

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('competitor_data')
      .select(
        'id, competitor_name, name, website_url, industry, followers, engagement_rate',
      )
      .eq('id', input.competitorId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Concurrent niet gevonden.');
    }

    const patch = {
      competitor_name: label,
      name: label,
      website_url: input.websiteUrl?.trim() || null,
      industry: input.industry?.trim() || null,
      description: input.description?.trim() || null,
      instagram_url: input.instagramUrl?.trim() || null,
      facebook_url: input.facebookUrl?.trim() || null,
      linkedin_url: input.linkedinUrl?.trim() || null,
      pinterest_url: input.pinterestUrl?.trim() || null,
      x_url: input.xUrl?.trim() || null,
      followers: parseOptionalNumber(input.followers, before.followers ?? 0),
      engagement_rate: parseOptionalNumber(
        input.engagementRate,
        before.engagement_rate ?? 0,
      ),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('competitor_data')
      .update(patch)
      .eq('id', input.competitorId)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-competitors] update failed:', error.message);
      throw new AppError('Concurrent kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.competitor.update',
      resourceType: 'competitor_data',
      resourceId: input.competitorId,
      beforeState: before,
      afterState: patch,
      metadata: { userId: input.userId },
    });

    revalidateCompetitorPaths(input.userId);
    return { ok: true, message: 'Concurrent opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Opslaan mislukt.'),
    };
  }
}

/** Soft deactivate: clears URLs and marks analysis insufficient (row kept). */
export async function deactivateUserCompetitor(input: {
  userId: string;
  competitorId: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireCompetitorMutator();
    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('competitor_data')
      .select('id, competitor_name, analysis_status')
      .eq('id', input.competitorId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Concurrent niet gevonden.');
    }

    const note = input.reason?.trim()
      ? `Gedeactiveerd via admin: ${input.reason.trim()}`
      : 'Gedeactiveerd via admin';

    const patch = {
      website_url: null,
      instagram_url: null,
      facebook_url: null,
      linkedin_url: null,
      pinterest_url: null,
      x_url: null,
      analysis_status: 'insufficient_data',
      description: note,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('competitor_data')
      .update(patch)
      .eq('id', input.competitorId)
      .eq('user_id', input.userId);

    if (error) {
      throw new AppError('Deactiveren mislukt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.competitor.deactivate',
      resourceType: 'competitor_data',
      resourceId: input.competitorId,
      beforeState: before,
      afterState: patch,
      metadata: { userId: input.userId },
    });

    revalidateCompetitorPaths(input.userId);
    return { ok: true, message: 'Concurrent gedeactiveerd (record behouden).' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Deactiveren mislukt.'),
    };
  }
}

export async function deleteUserCompetitor(input: {
  userId: string;
  competitorId: string;
  confirmName: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireCompetitorMutator();
    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('competitor_data')
      .select('id, competitor_name, name')
      .eq('id', input.competitorId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Concurrent niet gevonden.');
    }

    const expected =
      (typeof before.name === 'string' && before.name.trim()) ||
      before.competitor_name;
    if (input.confirmName.trim() !== expected) {
      throw new AppError('Bevestigingsnaam komt niet overeen.');
    }

    const { error } = await supabase
      .from('competitor_data')
      .delete()
      .eq('id', input.competitorId)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[user-competitors] delete failed:', error.message);
      throw new AppError('Verwijderen mislukt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.competitor.delete',
      resourceType: 'competitor_data',
      resourceId: input.competitorId,
      beforeState: before,
      metadata: { userId: input.userId },
    });

    revalidateCompetitorPaths(input.userId);
    return { ok: true, message: 'Concurrent verwijderd.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Verwijderen mislukt.'),
    };
  }
}
