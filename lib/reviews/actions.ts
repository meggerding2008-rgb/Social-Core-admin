'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { normalizePlanSlug } from '@/lib/reviews/frequency';
import {
  canMutateReviews,
  composeReviewFeedback,
  isReviewStatus,
  type ReviewStatus,
} from '@/lib/reviews/types';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

export type ReviewInput = {
  userId: string;
  title: string;
  status: ReviewStatus;
  subscriptionTier?: string;
  periodStart: string;
  periodEnd: string;
  summary?: string;
  whatWentWell?: string;
  improvementPoints?: string;
  performanceAnalysis?: string;
  recommendations?: string;
  recommendedContentTypes?: string;
  recommendedPostingFrequency?: string;
  platformRecommendations?: string;
  conclusion?: string;
  scheduledFor?: string;
};

async function requireReviewMutator() {
  const admin = await requireAdmin();
  if (!canMutateReviews(admin.profile.role)) {
    throw new AppError(
      'Alleen content-admins en superadmins mogen reviews wijzigen.',
    );
  }
  return admin;
}

function revalidateReviewPaths(id?: string, userId?: string) {
  revalidatePath('/reviews');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/reviews/${id}`);
  revalidatePath('/reviews/new');
  if (userId) revalidatePath(`/users/${userId}`);
}

/** Safe server log — no emails, tokens, or free-text review content. */
function logReviewDbError(
  op: string,
  error: {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  },
  meta?: Record<string, string | boolean | null | undefined>,
) {
  console.error('[reviews]', op, {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    ...meta,
  });
}

function mapReviewWriteError(error: {
  message?: string;
  code?: string;
  details?: string;
}): AppError {
  const msg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  const code = error.code ?? '';

  if (
    code === '23503' &&
    (msg.includes('notifications_related_post_id') ||
      msg.includes('related_post_id'))
  ) {
    return new AppError(
      'Verzenden mislukt door een databasefout in notificaties (related_post_id). Voer migratie 20260926_phase10b_fix_review_notify_fk.sql uit in Supabase.',
      'review_notify_fk',
    );
  }

  if (code === '23514' || msg.includes('content_reviews_status_check')) {
    return new AppError(
      'Ongeldige status voor de database. Voer migratie 20260926_phase10_periodic_reviews.sql uit als dat nog niet gebeurd is.',
      'review_status_check',
    );
  }

  if (
    msg.includes('column') &&
    (msg.includes('does not exist') || msg.includes('schema cache'))
  ) {
    return new AppError(
      'Reviewkolommen ontbreken. Voer supabase/migrations/20260926_phase10_periodic_reviews.sql uit in Supabase.',
      'review_schema',
    );
  }

  if (code === '42501' || msg.includes('row-level security')) {
    return new AppError(
      'Geen rechten om deze review op te slaan (RLS). Controleer je adminrol.',
      'review_rls',
    );
  }

  if (code === '23503' && msg.includes('created_by')) {
    return new AppError(
      'created_by kon niet worden gezet: admin staat niet in public.users.',
      'review_created_by',
    );
  }

  return new AppError('Review kon niet worden opgeslagen.', 'review_write');
}

function validateInput(input: ReviewInput) {
  const title = input.title.trim();
  const userId = input.userId.trim();
  const periodStart = input.periodStart.trim();
  const periodEnd = input.periodEnd.trim();

  if (!userId) throw new AppError('Selecteer een gebruiker.');
  if (!title) throw new AppError('Titel is verplicht.');
  if (!periodStart || Number.isNaN(Date.parse(periodStart))) {
    throw new AppError('Ongeldige periode-start.');
  }
  if (!periodEnd || Number.isNaN(Date.parse(periodEnd))) {
    throw new AppError('Ongeldige periode-einde.');
  }
  if (new Date(periodEnd) < new Date(periodStart)) {
    throw new AppError('Periode-einde moet na periode-start liggen.');
  }
  if (!isReviewStatus(input.status)) {
    throw new AppError('Ongeldige status.');
  }

  let scheduledFor: string | null = null;
  if (input.status === 'gepland') {
    if (!input.scheduledFor?.trim()) {
      throw new AppError('Plan een verzenddatum voor status Gepland.');
    }
    const when = new Date(input.scheduledFor);
    if (Number.isNaN(when.getTime())) {
      throw new AppError('Ongeldige geplande verzenddatum.');
    }
    scheduledFor = when.toISOString();
  } else if (input.scheduledFor?.trim()) {
    const when = new Date(input.scheduledFor);
    if (!Number.isNaN(when.getTime())) scheduledFor = when.toISOString();
  }

  const summary = input.summary?.trim() || null;
  const whatWentWell = input.whatWentWell?.trim() || null;
  const improvementPoints = input.improvementPoints?.trim() || null;
  const performanceAnalysis = input.performanceAnalysis?.trim() || null;
  const recommendations = input.recommendations?.trim() || null;
  const recommendedContentTypes = input.recommendedContentTypes?.trim() || null;
  const recommendedPostingFrequency =
    input.recommendedPostingFrequency?.trim() || null;
  const platformRecommendations = input.platformRecommendations?.trim() || null;
  const conclusion = input.conclusion?.trim() || null;

  const feedback = composeReviewFeedback({
    summary,
    whatWentWell,
    improvementPoints,
    performanceAnalysis,
    recommendations,
    recommendedContentTypes,
    recommendedPostingFrequency,
    platformRecommendations,
    conclusion,
  });

  const sentAt =
    input.status === 'verzonden' ? new Date().toISOString() : null;

  return {
    user_id: userId,
    title,
    status: input.status,
    subscription_tier: normalizePlanSlug(input.subscriptionTier || 'silver'),
    period_start: periodStart.slice(0, 10),
    period_end: periodEnd.slice(0, 10),
    review_date: periodEnd.slice(0, 10),
    summary,
    what_went_well: whatWentWell,
    improvement_points: improvementPoints,
    performance_analysis: performanceAnalysis,
    recommendations,
    recommended_content_types: recommendedContentTypes,
    recommended_posting_frequency: recommendedPostingFrequency,
    platform_recommendations: platformRecommendations,
    conclusion,
    scheduled_for: scheduledFor,
    feedback,
    score: null as string | null,
    sent_at: sentAt,
  };
}

async function resolveCreatedBy(
  adminId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', adminId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function createContentReview(
  input: ReviewInput,
): Promise<ActionResult> {
  try {
    const admin = await requireReviewMutator();
    const payload = validateInput(input);
    const createdBy = await resolveCreatedBy(admin.id);
    const supabase = await createClient();

    console.info('[reviews] create attempt', {
      status: payload.status,
      tier: payload.subscription_tier,
      hasPeriod: Boolean(payload.period_start && payload.period_end),
      hasSchedule: Boolean(payload.scheduled_for),
      hasCreatedBy: Boolean(createdBy),
      targetUserPrefix: payload.user_id.slice(0, 8),
    });

    const { data, error } = await supabase
      .from('content_reviews')
      .insert({
        ...payload,
        ...(createdBy ? { created_by: createdBy } : {}),
        // Never send post_id — periodieke reviews zijn niet post-gebonden
      })
      .select('id, user_id, title, status, scheduled_for, sent_at')
      .single();

    if (error) {
      logReviewDbError('create failed', error, {
        status: payload.status,
        tier: payload.subscription_tier,
      });
      throw mapReviewWriteError(error);
    }

    try {
      await logAdminAction({
        actorId: admin.id,
        action: 'content_review.create',
        resourceType: 'content_reviews',
        resourceId: data.id,
        afterState: {
          id: data.id,
          status: data.status,
          scheduled_for: data.scheduled_for,
          sent_at: data.sent_at,
        },
        metadata: {
          notifiesUser: data.status === 'verzonden',
          note: 'Notification only when status=verzonden (DB trigger)',
        },
      });
    } catch (auditError) {
      console.error(
        '[reviews] audit after create failed:',
        auditError instanceof Error ? auditError.message : auditError,
      );
      // Review is already saved — report success with audit warning
      revalidateReviewPaths(data.id, data.user_id);
      return {
        ok: true,
        id: data.id,
        message:
          'Review opgeslagen, maar auditlog mislukte. Controleer admin_audit_logs / RLS.',
      };
    }

    revalidateReviewPaths(data.id, data.user_id);
    return {
      ok: true,
      id: data.id,
      message:
        data.status === 'verzonden'
          ? 'Review verzonden. Gebruiker ontvangt een notificatie.'
          : data.status === 'gepland'
            ? 'Review gepland. Notificatie volgt pas bij verzenden.'
            : 'Concept opgeslagen.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Review kon niet worden aangemaakt.'),
    };
  }
}

export async function updateContentReview(input: ReviewInput & {
  id: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireReviewMutator();
    const payload = validateInput(input);
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('content_reviews')
      .select(
        'id, user_id, title, status, scheduled_for, sent_at, period_start, period_end',
      )
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Review niet gevonden.');
    }

    if (before.status === 'verzonden' && payload.status === 'concept') {
      throw new AppError('Een verzonden review kan niet terug naar concept.');
    }

    const { user_id: _ignored, sent_at: computedSent, ...updateFields } =
      payload;

    const sent_at =
      before.status === 'verzonden' && before.sent_at
        ? before.sent_at
        : computedSent;

    console.info('[reviews] update attempt', {
      idPrefix: input.id.slice(0, 8),
      fromStatus: before.status,
      toStatus: payload.status,
    });

    const { error } = await supabase
      .from('content_reviews')
      .update({ ...updateFields, sent_at })
      .eq('id', input.id);

    if (error) {
      logReviewDbError('update failed', error, {
        fromStatus: before.status,
        toStatus: payload.status,
      });
      throw mapReviewWriteError(error);
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'content_review.update',
      resourceType: 'content_reviews',
      resourceId: input.id,
      beforeState: {
        status: before.status,
        scheduled_for: before.scheduled_for,
        sent_at: before.sent_at,
      },
      afterState: {
        status: updateFields.status,
        scheduled_for: updateFields.scheduled_for,
        sent_at,
      },
    });

    revalidateReviewPaths(input.id, before.user_id);
    return { ok: true, id: input.id, message: 'Review opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Review kon niet worden opgeslagen.'),
    };
  }
}

export async function updateContentReviewStatus(input: {
  id: string;
  status: string;
  scheduledFor?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireReviewMutator();
    if (!isReviewStatus(input.status)) {
      throw new AppError('Ongeldige status.');
    }

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('content_reviews')
      .select('id, user_id, status, scheduled_for, sent_at, title')
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Review niet gevonden.');
    }

    const updates: Record<string, unknown> = { status: input.status };

    if (input.status === 'gepland') {
      const raw = input.scheduledFor || before.scheduled_for;
      if (!raw) throw new AppError('Geplande verzenddatum ontbreekt.');
      const when = new Date(raw);
      if (Number.isNaN(when.getTime())) {
        throw new AppError('Ongeldige geplande verzenddatum.');
      }
      updates.scheduled_for = when.toISOString();
    }

    if (input.status === 'verzonden') {
      updates.sent_at = before.sent_at || new Date().toISOString();
    }

    console.info('[reviews] status attempt', {
      idPrefix: input.id.slice(0, 8),
      fromStatus: before.status,
      toStatus: input.status,
    });

    const { error } = await supabase
      .from('content_reviews')
      .update(updates)
      .eq('id', input.id);

    if (error) {
      logReviewDbError('status failed', error, {
        fromStatus: before.status,
        toStatus: input.status,
      });
      throw mapReviewWriteError(error);
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'content_review.status',
      resourceType: 'content_reviews',
      resourceId: input.id,
      beforeState: { status: before.status },
      afterState: { status: input.status },
    });

    revalidateReviewPaths(input.id, before.user_id);
    return {
      ok: true,
      message:
        input.status === 'verzonden'
          ? 'Review gemarkeerd als verzonden; notificatie aangemaakt.'
          : 'Status bijgewerkt.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Status kon niet worden bijgewerkt.'),
    };
  }
}
