'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import {
  canMutatePopups,
  isPopupAudience,
  isPopupDisplayStyle,
  isPopupPersistUntil,
  isPopupStatus,
  isPopupType,
  type PopupAudienceFilter,
  type PopupPersistUntil,
  type PopupStatus,
} from '@/lib/popups/types';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

export type PopupInput = {
  title: string;
  body: string;
  type: string;
  audience: string;
  audienceTier?: string;
  audienceFeature?: string;
  status: string;
  displayStyle: string;
  startAt?: string;
  endAt?: string;
  showAfterDays?: string;
  showOnce: boolean;
  persistUntil: string;
};

async function requirePopupMutator() {
  const admin = await requireAdmin();
  if (!canMutatePopups(admin.profile.role)) {
    throw new AppError('Geen rechten om pop-ups te beheren.');
  }
  return admin;
}

function revalidatePopupPaths(id?: string) {
  revalidatePath('/popups');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/popups/${id}`);
  revalidatePath('/popups/new');
}

function toIsoOrNull(value?: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new AppError('Ongeldige datum/tijd.');
  return d.toISOString();
}

function buildPayload(input: PopupInput) {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new AppError('Titel is verplicht.');
  if (!body) throw new AppError('Inhoud is verplicht.');
  if (!isPopupType(input.type)) throw new AppError('Ongeldig type.');
  if (!isPopupAudience(input.audience)) throw new AppError('Ongeldige doelgroep.');
  if (!isPopupStatus(input.status)) throw new AppError('Ongeldige status.');
  if (!isPopupDisplayStyle(input.displayStyle)) {
    throw new AppError('Ongeldige weergavestijl.');
  }
  if (!isPopupPersistUntil(input.persistUntil)) {
    throw new AppError('Ongeldige herhaalregel.');
  }

  const startAt = toIsoOrNull(input.startAt);
  const endAt = toIsoOrNull(input.endAt);
  if (startAt && endAt && new Date(endAt) < new Date(startAt)) {
    throw new AppError('Einddatum moet na startdatum liggen.');
  }

  if (input.status === 'gepland' && !startAt) {
    throw new AppError('Geplande pop-ups vereisen een startdatum.');
  }

  let showAfterDays: number | null = null;
  if (input.showAfterDays?.trim()) {
    const n = Number(input.showAfterDays);
    if (!Number.isFinite(n) || n < 0) {
      throw new AppError('Dagen na eerste gebruik moet 0 of hoger zijn.');
    }
    showAfterDays = Math.floor(n);
  }

  const audience_filter: PopupAudienceFilter = {};
  if (input.audience === 'subscription') {
    const tier = input.audienceTier?.trim().toLowerCase();
    if (!tier) throw new AppError('Kies een abonnement voor deze doelgroep.');
    audience_filter.tier = tier;
  }
  if (input.audience === 'feature') {
    const feature = input.audienceFeature?.trim();
    if (!feature) throw new AppError('Vul een functienaam in voor deze doelgroep.');
    audience_filter.feature = feature;
  }

  return {
    title,
    body,
    type: input.type,
    audience: input.audience,
    audience_filter,
    status: input.status as PopupStatus,
    display_style: input.displayStyle,
    start_at: startAt,
    end_at: endAt,
    show_after_days: showAfterDays,
    show_once: input.showOnce,
    persist_until: input.persistUntil as PopupPersistUntil,
  };
}

export async function createPopup(input: PopupInput): Promise<ActionResult> {
  try {
    const admin = await requirePopupMutator();
    const payload = buildPayload(input);
    const supabase = await createClient();

    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('id', admin.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('admin_popups')
      .insert({
        ...payload,
        created_by: userRow?.id ?? null,
      })
      .select('id, title, status, start_at, end_at')
      .single();

    if (error) {
      console.error('[popups] create failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      if (error.message.includes('admin_popups')) {
        throw new AppError(
          'Pop-uptabel ontbreekt. Voer 20260927_admin_popups.sql uit in Supabase.',
        );
      }
      throw new AppError('Pop-up kon niet worden aangemaakt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'popup.create',
      resourceType: 'admin_popups',
      resourceId: data.id,
      afterState: data,
    });

    revalidatePopupPaths(data.id);
    return { ok: true, id: data.id, message: 'Pop-up opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Pop-up kon niet worden aangemaakt.'),
    };
  }
}

export async function updatePopup(
  input: PopupInput & { id: string },
): Promise<ActionResult> {
  try {
    const admin = await requirePopupMutator();
    const payload = buildPayload(input);
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('admin_popups')
      .select('id, title, status, start_at, end_at')
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) throw new AppError('Pop-up niet gevonden.');

    const { error } = await supabase
      .from('admin_popups')
      .update(payload)
      .eq('id', input.id);

    if (error) {
      console.error('[popups] update failed:', error.message);
      throw new AppError('Pop-up kon niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'popup.update',
      resourceType: 'admin_popups',
      resourceId: input.id,
      beforeState: before,
      afterState: { status: payload.status, title: payload.title },
    });

    revalidatePopupPaths(input.id);
    return { ok: true, id: input.id, message: 'Pop-up opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Pop-up kon niet worden opgeslagen.'),
    };
  }
}

export async function updatePopupStatus(input: {
  id: string;
  status: string;
}): Promise<ActionResult> {
  try {
    const admin = await requirePopupMutator();
    if (!isPopupStatus(input.status)) throw new AppError('Ongeldige status.');

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('admin_popups')
      .select('id, status')
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) throw new AppError('Pop-up niet gevonden.');

    const { error } = await supabase
      .from('admin_popups')
      .update({ status: input.status })
      .eq('id', input.id);

    if (error) {
      console.error('[popups] status failed:', error.message);
      throw new AppError('Status kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'popup.status',
      resourceType: 'admin_popups',
      resourceId: input.id,
      beforeState: before,
      afterState: { status: input.status },
    });

    revalidatePopupPaths(input.id);
    return { ok: true, message: 'Status bijgewerkt.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Status kon niet worden bijgewerkt.'),
    };
  }
}
