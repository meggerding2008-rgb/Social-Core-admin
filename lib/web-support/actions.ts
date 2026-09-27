'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import {
  isValidEmail,
  plainTextToHtml,
  sendBrevoTransactionalEmail,
} from '@/lib/brevo/client';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { canMutateSupport } from '@/lib/support/types';
import {
  isWebsiteMessageStatus,
  replySubjectFromOriginal,
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

/**
 * Send an email reply via Brevo, then persist website_message_replies
 * and mark the parent message as beantwoord.
 */
export async function sendWebsiteMessageEmailReply(input: {
  messageId: string;
  body: string;
  /** Client idempotency token to ignore double-clicks */
  clientRequestId?: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    const admin = await requireWebSupportMutator();
    const body = input.body.trim();
    if (!body) throw new AppError('Vul een antwoord in.');
    if (body.length > 10000) throw new AppError('Antwoord is te lang.');

    const supabase = await createClient();
    const { data: web, error: webError } = await supabase
      .from('website_messages')
      .select('id, sender_name, sender_email, subject, status, replied_at')
      .eq('id', input.messageId)
      .maybeSingle();

    if (webError || !web) {
      throw new AppError('Websitebericht niet gevonden.');
    }

    const recipient = String(web.sender_email ?? '')
      .trim()
      .toLowerCase();
    if (!isValidEmail(recipient)) {
      throw new AppError('Het afzender-e-mailadres is ongeldig.');
    }

    // Soft de-dupe: same admin + message + identical body within 2 minutes
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('website_message_replies')
      .select('id, message, created_at')
      .eq('website_message_id', input.messageId)
      .eq('admin_id', admin.id)
      .eq('message', body)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.id) {
      return {
        ok: true,
        id: recent.id,
        message: 'Dit antwoord is zojuist al verzonden (dubbele klik genegeerd).',
      };
    }

    const subject = replySubjectFromOriginal(
      typeof web.subject === 'string' ? web.subject : null,
    );

    const sendResult = await sendBrevoTransactionalEmail({
      toEmail: recipient,
      toName: typeof web.sender_name === 'string' ? web.sender_name : undefined,
      subject,
      htmlContent: plainTextToHtml(body),
    });

    if (!sendResult.ok) {
      throw new AppError(sendResult.error);
    }

    const now = new Date().toISOString();

    const { data: reply, error: replyError } = await supabase
      .from('website_message_replies')
      .insert({
        website_message_id: input.messageId,
        admin_id: admin.id,
        message: body,
        recipient_email: recipient,
        sent_at: now,
        delivery_status: 'accepted',
        created_at: now,
      })
      .select('id')
      .single();

    if (replyError || !reply) {
      console.error('[web-support] reply insert failed:', replyError?.message);
      if (
        replyError?.message?.includes('website_message_replies') ||
        replyError?.message?.includes('schema cache')
      ) {
        throw new AppError(
          'E-mail is verzonden, maar opslaan mislukte: voer 20260927_website_message_replies.sql uit.',
        );
      }
      throw new AppError(
        'E-mail is verzonden, maar het antwoord kon niet worden opgeslagen.',
      );
    }

    const { error: updateError } = await supabase
      .from('website_messages')
      .update({
        status: 'beantwoord',
        replied_at: now,
        assigned_to: admin.id,
      })
      .eq('id', input.messageId);

    if (updateError) {
      console.error(
        '[web-support] status after reply failed:',
        updateError.message,
      );
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'web_support.message.email_reply',
      resourceType: 'website_message_replies',
      resourceId: reply.id,
      beforeState: {
        website_message_id: input.messageId,
        status: web.status,
        replied_at: web.replied_at,
      },
      afterState: {
        status: 'beantwoord',
        replied_at: now,
        recipient_email: recipient,
        delivery_status: 'accepted',
      },
      metadata: {
        websiteMessageId: input.messageId,
        brevoMessageId: sendResult.messageId,
        clientRequestId: input.clientRequestId ?? null,
        subject,
        bodyLength: body.length,
      },
    });

    revalidateWebSupport(input.messageId);
    return {
      ok: true,
      id: reply.id,
      message: `Antwoord verzonden naar ${recipient}.`,
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Antwoord kon niet worden verzonden.'),
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
