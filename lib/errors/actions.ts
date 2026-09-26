'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import {
  canMutateErrors,
  isErrorSeverity,
  isErrorStatus,
} from '@/lib/errors/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireErrorMutator() {
  const admin = await requireAdmin();
  if (!canMutateErrors(admin.profile.role)) {
    throw new AppError('Geen rechten om foutmeldingen te wijzigen.');
  }
  return admin;
}

export async function updateErrorReport(input: {
  id: string;
  status?: string;
  severity?: string;
  assigneeAdminId?: string | null;
  internalNote?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireErrorMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('error_reports')
      .select('id, status, severity, assignee_admin_id, context, resolved_at, resolved_by')
      .eq('id', input.id)
      .maybeSingle();

    if (beforeError || !before) throw new AppError('Foutmelding niet gevonden.');

    const updates: Record<string, unknown> = {};
    if (input.status !== undefined) {
      if (!isErrorStatus(input.status)) throw new AppError('Ongeldige status.');
      updates.status = input.status;
      if (input.status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = admin.id;
      }
      if (input.status === 'open' || input.status === 'triaged') {
        updates.resolved_at = null;
        updates.resolved_by = null;
      }
    }
    if (input.severity !== undefined) {
      if (!isErrorSeverity(input.severity)) throw new AppError('Ongeldige severity.');
      updates.severity = input.severity;
    }
    if (input.assigneeAdminId !== undefined) {
      updates.assignee_admin_id = input.assigneeAdminId || null;
    }

    const ctx =
      before.context && typeof before.context === 'object'
        ? { ...(before.context as Record<string, unknown>) }
        : {};
    if (input.internalNote?.trim()) {
      const notes = Array.isArray(ctx.internal_notes)
        ? [...(ctx.internal_notes as unknown[])]
        : [];
      notes.push({
        at: new Date().toISOString(),
        by: admin.id,
        note: input.internalNote.trim().slice(0, 2000),
      });
      ctx.internal_notes = notes;
      updates.context = ctx;
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('Geen wijzigingen.');
    }

    const { error } = await supabase
      .from('error_reports')
      .update(updates)
      .eq('id', input.id);

    if (error) {
      console.error('[errors] update failed:', error.message);
      throw new AppError('Foutmelding kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'error_report.update',
      resourceType: 'error_reports',
      resourceId: input.id,
      beforeState: before,
      afterState: updates,
    });

    revalidatePath('/errors');
    revalidatePath(`/errors/${input.id}`);
    return { ok: true, message: 'Foutmelding bijgewerkt.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Foutmelding kon niet worden bijgewerkt.'),
    };
  }
}
