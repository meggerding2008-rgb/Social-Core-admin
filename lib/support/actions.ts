'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import {
  canMutateSupport,
  isSupportAdminSettableStatus,
  type SupportAdminSettableStatus,
} from '@/lib/support/types';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

async function requireSupportMutator() {
  const admin = await requireAdmin();
  if (!canMutateSupport(admin.profile.role)) {
    throw new AppError('Je hebt geen rechten om support te bewerken.');
  }
  return admin;
}

export async function replyToSupportMessage(input: {
  messageId: string;
  reply: string;
  status?: SupportAdminSettableStatus;
}): Promise<ActionResult> {
  try {
    const admin = await requireSupportMutator();
    const reply = input.reply.trim();
    if (!reply) {
      throw new AppError('Vul een antwoord in.');
    }
    if (reply.length > 10000) {
      throw new AppError('Antwoord is te lang.');
    }

    const nextStatus: SupportAdminSettableStatus =
      input.status && isSupportAdminSettableStatus(input.status)
        ? input.status
        : 'beantwoord';

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('support_messages')
      .select('id, status, admin_reply, priority, subject')
      .eq('id', input.messageId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Supportvraag niet gevonden.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('support_messages')
      .update({
        admin_reply: reply,
        status: nextStatus,
        updated_at: now,
      })
      .eq('id', input.messageId);

    if (error) {
      console.error('[support] reply failed:', error.message);
      throw new AppError('Antwoord kon niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'support.message.reply',
      resourceType: 'support_messages',
      resourceId: input.messageId,
      beforeState: before,
      afterState: {
        admin_reply: reply,
        status: nextStatus,
        updated_at: now,
      },
    });

    revalidatePath('/app-support');
    revalidatePath(`/app-support/${input.messageId}`);
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Antwoord kon niet worden opgeslagen.'),
    };
  }
}

export async function updateSupportMessageStatus(input: {
  messageId: string;
  status: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireSupportMutator();
    if (!isSupportAdminSettableStatus(input.status)) {
      throw new AppError('Ongeldige status.');
    }

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('support_messages')
      .select('id, status')
      .eq('id', input.messageId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Supportvraag niet gevonden.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('support_messages')
      .update({ status: input.status, updated_at: now })
      .eq('id', input.messageId);

    if (error) {
      console.error('[support] status failed:', error.message);
      throw new AppError('Status kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'support.message.status',
      resourceType: 'support_messages',
      resourceId: input.messageId,
      beforeState: before,
      afterState: { status: input.status, updated_at: now },
    });

    revalidatePath('/app-support');
    revalidatePath(`/app-support/${input.messageId}`);
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Status kon niet worden bijgewerkt.'),
    };
  }
}

export async function updateSupportMessagePriority(input: {
  messageId: string;
  priority: boolean;
}): Promise<ActionResult> {
  try {
    const admin = await requireSupportMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('support_messages')
      .select('id, priority')
      .eq('id', input.messageId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Supportvraag niet gevonden.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('support_messages')
      .update({ priority: input.priority, updated_at: now })
      .eq('id', input.messageId);

    if (error) {
      console.error('[support] priority failed:', error.message);
      throw new AppError('Prioriteit kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'support.message.priority',
      resourceType: 'support_messages',
      resourceId: input.messageId,
      beforeState: before,
      afterState: { priority: input.priority, updated_at: now },
    });

    revalidatePath('/app-support');
    revalidatePath(`/app-support/${input.messageId}`);
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Prioriteit kon niet worden bijgewerkt.'),
    };
  }
}

export async function addHumanConversationMessage(input: {
  conversationId: string;
  content: string;
  ticketId?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireSupportMutator();
    const content = input.content.trim();
    if (!content) {
      throw new AppError('Vul een bericht in.');
    }
    if (content.length > 10000) {
      throw new AppError('Bericht is te lang.');
    }

    const supabase = await createClient();

    const { data: conversation, error: conversationError } = await supabase
      .from('support_conversations')
      .select('id, type, status, user_id')
      .eq('id', input.conversationId)
      .maybeSingle();

    if (conversationError || !conversation) {
      throw new AppError('Gesprek niet gevonden.');
    }

    if (conversation.type !== 'human') {
      throw new AppError('Alleen menselijke gesprekken kunnen hier beantwoord worden.');
    }

    const { data: inserted, error } = await supabase
      .from('support_conversation_messages')
      .insert({
        conversation_id: input.conversationId,
        sender_type: 'human',
        content,
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[support] conversation reply failed:', error.message);
      throw new AppError('Bericht kon niet worden geplaatst.');
    }

    const now = new Date().toISOString();
    await supabase
      .from('support_conversations')
      .update({
        updated_at: now,
        last_message_at: now,
        status: conversation.status === 'closed' ? 'open' : conversation.status,
      })
      .eq('id', input.conversationId);

    await logAdminAction({
      actorId: admin.id,
      action: 'support.conversation.message.create',
      resourceType: 'support_conversation_messages',
      resourceId: inserted.id,
      afterState: {
        conversation_id: input.conversationId,
        sender_type: 'human',
        content,
      },
      metadata: {
        ticketId: input.ticketId ?? null,
        userId: conversation.user_id,
      },
    });

    if (input.ticketId) {
      revalidatePath(`/app-support/${input.ticketId}`);
    }
    revalidatePath('/app-support');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Bericht kon niet worden geplaatst.'),
    };
  }
}

/**
 * Admin starts a support thread toward a user (no prior user contact required).
 * Creates ticket + human conversation message + in-app notification.
 * Uses existing notifications table; no new email flow.
 */
export async function contactUserFromAdmin(input: {
  userId: string;
  subject: string;
  message: string;
  /** Client idempotency token to ignore double-clicks */
  clientRequestId?: string;
}): Promise<ActionResult & { id?: string }> {
  try {
    const admin = await requireSupportMutator();
    const userId = input.userId.trim();
    const subject = input.subject.trim();
    const message = input.message.trim();

    if (!userId) throw new AppError('Selecteer een gebruiker.');
    if (!subject) throw new AppError('Onderwerp is verplicht.');
    if (!message) throw new AppError('Bericht is verplicht.');
    if (subject.length > 200) throw new AppError('Onderwerp is te lang.');
    if (message.length > 10000) throw new AppError('Bericht is te lang.');

    const supabase = await createClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      throw new AppError('Gebruiker niet gevonden.');
    }

    // Soft de-dupe: same admin + user + subject within last 2 minutes
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('support_messages')
      .select('id, subject, created_at')
      .eq('user_id', userId)
      .eq('source', 'admin_initiated')
      .eq('subject', subject)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.id) {
      return {
        ok: true,
        id: recent.id,
        message: 'Dit bericht is zojuist al verzonden (dubbele klik genegeerd).',
      };
    }

    const now = new Date().toISOString();

    const { data: ticket, error: ticketError } = await supabase
      .from('support_messages')
      .insert({
        user_id: userId,
        subject,
        message,
        admin_reply: message,
        category: 'Algemeen',
        priority: false,
        status: 'open',
        source: 'admin_initiated',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (ticketError || !ticket) {
      console.error('[support] contact insert failed:', {
        code: ticketError?.code,
        message: ticketError?.message,
        details: ticketError?.details,
      });
      if (ticketError?.message?.includes('source')) {
        throw new AppError(
          'Kolom source ontbreekt. Voer 20260927_support_admin_outreach.sql uit in Supabase.',
        );
      }
      if (
        ticketError?.message?.toLowerCase().includes('row-level security') ||
        ticketError?.code === '42501'
      ) {
        throw new AppError(
          'Geen INSERT-rechten op support_messages. Voer de outreach-migratie uit.',
        );
      }
      throw new AppError('Bericht kon niet worden aangemaakt.');
    }

    const { data: conversation, error: convError } = await supabase
      .from('support_conversations')
      .insert({
        user_id: userId,
        type: 'human',
        status: 'open',
        title: subject,
        created_at: now,
        updated_at: now,
        last_message_at: now,
      })
      .select('id')
      .single();

    if (convError || !conversation) {
      console.error('[support] conversation create failed:', convError?.message);
      // Ticket exists — continue without failing hard on conversation
    } else {
      const { error: msgError } = await supabase
        .from('support_conversation_messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'human',
          content: message,
          created_at: now,
        });
      if (msgError) {
        console.error('[support] conversation message failed:', msgError.message);
      }
    }

    // Prefer explicit notification (related_post_id NULL). Trigger may also fire
    // because admin_reply is set — de-dupe via unread same link.
    const linkPath = `/support?ticket=${ticket.id}`;
    const { data: existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'support_team_reply')
      .eq('link_url', linkPath)
      .eq('read', false)
      .maybeSingle();

    if (!existingNotif) {
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: userId,
        type: 'support_team_reply',
        title: 'Bericht van Social Core',
        message: `Social Core stuurde je een bericht: '${subject.slice(0, 80)}'.`,
        related_post_id: null,
        link_url: linkPath,
        link_label: 'Bekijk bericht',
      });
      if (notifError) {
        console.error('[support] notification failed:', notifError.message);
      }
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'support.message.contact_user',
      resourceType: 'support_messages',
      resourceId: ticket.id,
      afterState: {
        user_id: userId,
        subject,
        status: 'open',
        source: 'admin_initiated',
        conversation_id: conversation?.id ?? null,
      },
      metadata: {
        clientRequestId: input.clientRequestId ?? null,
        notifiesUser: true,
        emailFlow: 'none — only existing notifications table',
      },
    });

    revalidatePath('/app-support');
    revalidatePath(`/app-support/${ticket.id}`);
    revalidatePath('/dashboard');
    revalidatePath(`/users/${userId}`);
    return { ok: true, id: ticket.id };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Bericht kon niet worden verzonden.'),
    };
  }
}
