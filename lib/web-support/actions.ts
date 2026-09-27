'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { canMutateSupport } from '@/lib/support/types';
import {
  isWebsiteMessageStatus,
  type WebsiteMessageStatus,
} from '@/lib/web-support/types';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

async function requireWebSupportMutator() {
  const admin = await requireAdmin();
  if (!canMutateSupport(admin.profile.role)) {
    throw new AppError('Je hebt geen rechten om web support te bewerken.');
  }
  return admin;
}

function revalidateWebSupport(id?: string) {
  revalidatePath('/web-support');
  revalidatePath('/app-support');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/web-support/${id}`);
}

export async function updateWebsiteMessageStatus(input: {
  messageId: string;
  status: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireWebSupportMutator();
    if (!isWebsiteMessageStatus(input.status)) {
      throw new AppError('Ongeldige status.');
    }

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('website_messages')
      .select('id, status')
      .eq('id', input.messageId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Websitebericht niet gevonden.');
    }

    const patch: Record<string, unknown> = {
      status: input.status,
    };
    if (input.status === 'beantwoord') {
      patch.replied_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('website_messages')
      .update(patch)
      .eq('id', input.messageId);

    if (error) {
      console.error('[web-support] status failed:', error.message);
      throw new AppError('Status kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'web_support.message.status',
      resourceType: 'website_messages',
      resourceId: input.messageId,
      beforeState: before,
      afterState: patch,
    });

    revalidateWebSupport(input.messageId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Status kon niet worden bijgewerkt.'),
    };
  }
}

export async function assignWebsiteMessage(input: {
  messageId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireWebSupportMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('website_messages')
      .select('id, status, assigned_to')
      .eq('id', input.messageId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Websitebericht niet gevonden.');
    }

    const nextStatus: WebsiteMessageStatus =
      before.status === 'nieuw' ? 'in_behandeling' : before.status;

    const { error } = await supabase
      .from('website_messages')
      .update({
        assigned_to: admin.id,
        status: nextStatus,
      })
      .eq('id', input.messageId);

    if (error) {
      console.error('[web-support] assign failed:', error.message);
      throw new AppError('Toewijzing mislukt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'web_support.message.assign',
      resourceType: 'website_messages',
      resourceId: input.messageId,
      beforeState: before,
      afterState: { assigned_to: admin.id, status: nextStatus },
    });

    revalidateWebSupport(input.messageId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Toewijzing mislukt.'),
    };
  }
}

export async function replyToWebsiteMessage(input: {
  messageId: string;
  note: string;
  status?: WebsiteMessageStatus;
}): Promise<ActionResult> {
  try {
    const admin = await requireWebSupportMutator();
    const note = input.note.trim();
    if (!note) throw new AppError('Vul een notitie of antwoord in.');
    if (note.length > 10000) throw new AppError('Tekst is te lang.');

    const nextStatus: WebsiteMessageStatus =
      input.status && isWebsiteMessageStatus(input.status)
        ? input.status
        : 'beantwoord';

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('website_messages')
      .select('id, status, payload, replied_at')
      .eq('id', input.messageId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Websitebericht niet gevonden.');
    }

    const prevPayload =
      before.payload && typeof before.payload === 'object'
        ? (before.payload as Record<string, unknown>)
        : {};

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('website_messages')
      .update({
        status: nextStatus,
        replied_at: now,
        assigned_to: admin.id,
        payload: {
          ...prevPayload,
          admin_notes: [
            ...((Array.isArray(prevPayload.admin_notes)
              ? prevPayload.admin_notes
              : []) as unknown[]),
            {
              at: now,
              by: admin.id,
              note,
            },
          ],
        },
      })
      .eq('id', input.messageId);

    if (error) {
      console.error('[web-support] reply failed:', error.message);
      throw new AppError('Antwoord kon niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'web_support.message.reply',
      resourceType: 'website_messages',
      resourceId: input.messageId,
      beforeState: { status: before.status, replied_at: before.replied_at },
      afterState: { status: nextStatus, replied_at: now },
      metadata: { noteLength: note.length },
    });

    revalidateWebSupport(input.messageId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Antwoord kon niet worden opgeslagen.'),
    };
  }
}

/**
 * Convert a website message into an app support ticket (source=website_converted).
 */
export async function convertWebsiteMessageToAppTicket(input: {
  messageId: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    const admin = await requireWebSupportMutator();
    const supabase = await createClient();

    const { data: web, error: webError } = await supabase
      .from('website_messages')
      .select(
        'id, sender_name, sender_email, subject, message, status, user_id, support_ticket_id',
      )
      .eq('id', input.messageId)
      .maybeSingle();

    if (webError || !web) {
      throw new AppError('Websitebericht niet gevonden.');
    }

    if (web.support_ticket_id) {
      return {
        ok: true,
        id: web.support_ticket_id,
        message: 'Dit bericht is al omgezet naar een app-supportticket.',
      };
    }

    let userId = typeof web.user_id === 'string' ? web.user_id : null;

    if (!userId) {
      const email = String(web.sender_email).trim().toLowerCase();
      const { data: matched } = await supabase
        .from('users')
        .select('id')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();
      userId = matched?.id ?? null;
    }

    if (!userId) {
      throw new AppError(
        'Geen gekoppelde gebruiker. Koppel eerst op e-mail of vraag de gebruiker een account te maken.',
      );
    }

    const now = new Date().toISOString();
    const subject =
      (typeof web.subject === 'string' && web.subject.trim()) ||
      `Websitebericht van ${web.sender_name}`;

    const { data: ticket, error: ticketError } = await supabase
      .from('support_messages')
      .insert({
        user_id: userId,
        subject,
        message: web.message,
        category: 'Algemeen',
        priority: false,
        status: 'open',
        source: 'website_converted',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (ticketError || !ticket) {
      console.error('[web-support] convert insert failed:', ticketError?.message);
      if (ticketError?.message?.includes('website_converted')) {
        throw new AppError(
          'Bron website_converted ontbreekt. Voer 20260927_website_messages.sql uit.',
        );
      }
      throw new AppError('Omzetten naar app-ticket mislukt.');
    }

    const { error: linkError } = await supabase
      .from('website_messages')
      .update({
        support_ticket_id: ticket.id,
        user_id: userId,
        status: 'in_behandeling',
        assigned_to: admin.id,
      })
      .eq('id', input.messageId);

    if (linkError) {
      console.error('[web-support] convert link failed:', linkError.message);
      throw new AppError('Ticket aangemaakt, maar koppeling mislukte.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'web_support.convert_to_app_ticket',
      resourceType: 'website_messages',
      resourceId: input.messageId,
      afterState: {
        support_ticket_id: ticket.id,
        user_id: userId,
        source: 'website_converted',
      },
    });

    revalidateWebSupport(input.messageId);
    revalidatePath(`/app-support/${ticket.id}`);
    return { ok: true, id: ticket.id };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Omzetten mislukt.'),
    };
  }
}
