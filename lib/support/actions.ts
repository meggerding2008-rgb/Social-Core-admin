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
  | { ok: true }
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

    revalidatePath('/support');
    revalidatePath(`/support/${input.messageId}`);
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

    revalidatePath('/support');
    revalidatePath(`/support/${input.messageId}`);
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

    revalidatePath('/support');
    revalidatePath(`/support/${input.messageId}`);
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
      revalidatePath(`/support/${input.ticketId}`);
    }
    revalidatePath('/support');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Bericht kon niet worden geplaatst.'),
    };
  }
}
