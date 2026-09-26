'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { canMutateBroadcasts } from '@/lib/broadcasts/types';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

async function requireBroadcastMutator() {
  const admin = await requireAdmin();
  if (!canMutateBroadcasts(admin.profile.role)) {
    throw new AppError('Alleen superadmins mogen broadcasts beheren.');
  }
  return admin;
}

export async function createBroadcast(input: {
  title: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  scheduledFor?: string;
  sendMode: 'now' | 'schedule';
}): Promise<ActionResult> {
  try {
    const admin = await requireBroadcastMutator();
    const title = input.title.trim();
    const message = input.message.trim();
    if (!title || !message) throw new AppError('Titel en bericht zijn verplicht.');

    let scheduledFor = new Date().toISOString();
    if (input.sendMode === 'schedule') {
      if (!input.scheduledFor) throw new AppError('Plan een datum/tijd.');
      const when = new Date(input.scheduledFor);
      if (Number.isNaN(when.getTime())) throw new AppError('Ongeldige planning.');
      scheduledFor = when.toISOString();
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('broadcast_notifications')
      .insert({
        title,
        message,
        link_url: input.linkUrl?.trim() || null,
        link_label: input.linkLabel?.trim() || 'Lees artikel',
        scheduled_for: scheduledFor,
      })
      .select('id, title, scheduled_for')
      .single();

    if (error) {
      console.error('[broadcasts] create failed:', error.message);
      throw new AppError('Broadcast kon niet worden aangemaakt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'broadcast.create',
      resourceType: 'broadcast_notifications',
      resourceId: data.id,
      afterState: data,
      metadata: {
        audience: 'all_users',
        sendMode: input.sendMode,
        dispatcher: 'user-app /api/admin/dispatch-broadcasts',
      },
    });

    revalidatePath('/broadcasts');
    revalidatePath(`/broadcasts/${data.id}`);

    let messageOut =
      input.sendMode === 'now'
        ? 'Broadcast opgeslagen (scheduled_for=nu). Trigger de bestaande gebruikersapp-dispatcher om te verzenden.'
        : 'Broadcast gepland. De bestaande dispatcher verwerkt deze wanneer scheduled_for is bereikt.';

    // Optionally ping existing dispatcher (does not re-implement fan-out).
    if (input.sendMode === 'now') {
      const ping = await triggerUserAppDispatcher();
      if (ping.ok) {
        messageOut = `Broadcast aangemaakt en dispatcher aangeroepen (${ping.detail}).`;
      } else if (ping.detail) {
        messageOut += ` Dispatcher-aanroep: ${ping.detail}`;
      }
    }

    return { ok: true, id: data.id, message: messageOut };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Broadcast kon niet worden aangemaakt.'),
    };
  }
}

export async function updateBroadcast(input: {
  id: string;
  title: string;
  message: string;
  linkUrl?: string;
  linkLabel?: string;
  scheduledFor: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireBroadcastMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('broadcast_notifications')
      .select('*')
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) throw new AppError('Broadcast niet gevonden.');
    if (before.dispatched_at) {
      throw new AppError('Verzonden broadcasts kunnen niet meer worden bewerkt.');
    }

    const title = input.title.trim();
    const message = input.message.trim();
    if (!title || !message) throw new AppError('Titel en bericht zijn verplicht.');

    const when = new Date(input.scheduledFor);
    if (Number.isNaN(when.getTime())) throw new AppError('Ongeldige planning.');

    const updates = {
      title,
      message,
      link_url: input.linkUrl?.trim() || null,
      link_label: input.linkLabel?.trim() || 'Lees artikel',
      scheduled_for: when.toISOString(),
    };

    const { error } = await supabase
      .from('broadcast_notifications')
      .update(updates)
      .eq('id', input.id)
      .is('dispatched_at', null);

    if (error) {
      console.error('[broadcasts] update failed:', error.message);
      throw new AppError('Broadcast kon niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'broadcast.update',
      resourceType: 'broadcast_notifications',
      resourceId: input.id,
      beforeState: before,
      afterState: updates,
    });

    revalidatePath('/broadcasts');
    revalidatePath(`/broadcasts/${input.id}`);
    return { ok: true, message: 'Broadcast opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Broadcast kon niet worden opgeslagen.'),
    };
  }
}

export async function requestBroadcastDispatch(): Promise<ActionResult> {
  try {
    const admin = await requireBroadcastMutator();
    const ping = await triggerUserAppDispatcher();
    await logAdminAction({
      actorId: admin.id,
      action: 'broadcast.dispatch_request',
      resourceType: 'broadcast_notifications',
      metadata: { result: ping },
    });
    if (!ping.ok) {
      throw new AppError(
        ping.detail ||
          'Dispatcher niet bereikbaar. Controleer USER_APP_URL en ADMIN_BROADCAST_TOKEN.',
      );
    }
    revalidatePath('/broadcasts');
    return { ok: true, message: `Dispatcher uitgevoerd: ${ping.detail}` };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Dispatcher-aanroep mislukt.'),
    };
  }
}

async function triggerUserAppDispatcher(): Promise<{
  ok: boolean;
  detail: string;
}> {
  const base = process.env.USER_APP_URL?.replace(/\/$/, '');
  const token = process.env.ADMIN_BROADCAST_TOKEN?.trim();
  if (!base || !token) {
    return {
      ok: false,
      detail:
        'USER_APP_URL of ADMIN_BROADCAST_TOKEN ontbreekt in .env.local (optioneel tot dispatch).',
    };
  }

  try {
    const res = await fetch(`${base}/api/admin/dispatch-broadcasts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status}` };
    }
    return { ok: true, detail: text.slice(0, 200) || 'OK' };
  } catch {
    return { ok: false, detail: 'Netwerkfout bij dispatcher-aanroep.' };
  }
}
