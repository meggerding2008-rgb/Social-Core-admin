'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { canMutateUsers } from '@/lib/users/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireUserMutator() {
  const admin = await requireAdmin();
  if (!canMutateUsers(admin.profile.role)) {
    throw new AppError('Alleen superadmins mogen gebruikers wijzigen.');
  }
  return admin;
}

function revalidateUserPaths(userId: string) {
  revalidatePath('/users');
  revalidatePath(`/users/${userId}`);
}

export async function blockUserAccount(input: {
  userId: string;
  reason?: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireUserMutator();
    if (input.userId === admin.id) {
      throw new AppError('Je kunt je eigen admin-account niet blokkeren.');
    }

    const reason = input.reason?.trim() || null;
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('users')
      .select('id, email, account_status, blocked_at, blocked_reason')
      .eq('id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Gebruiker niet gevonden.');
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('users')
      .update({
        account_status: 'blocked',
        blocked_at: now,
        blocked_reason: reason,
      })
      .eq('id', input.userId);

    if (error) {
      console.error('[users] block failed:', error.message);
      throw new AppError('Account kon niet worden geblokkeerd.');
    }

    // Auth ban via Admin API (service role) — blocks future sign-in.
    const service = createServiceRoleClient();
    const { error: banError } = await service.auth.admin.updateUserById(
      input.userId,
      { ban_duration: '876600h' },
    );
    if (banError) {
      console.error('[users] auth ban failed:', banError.message);
      throw new AppError(
        'Accountstatus bijgewerkt, maar Auth-blokkade mislukte. Probeer opnieuw.',
      );
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.account.block',
      resourceType: 'users',
      resourceId: input.userId,
      beforeState: before,
      afterState: {
        account_status: 'blocked',
        blocked_at: now,
        blocked_reason: reason,
      },
    });

    revalidateUserPaths(input.userId);
    return { ok: true, message: 'Account geblokkeerd.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Account kon niet worden geblokkeerd.'),
    };
  }
}

export async function activateUserAccount(input: {
  userId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireUserMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('users')
      .select('id, email, account_status, blocked_at, blocked_reason')
      .eq('id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Gebruiker niet gevonden.');
    }

    const { error } = await supabase
      .from('users')
      .update({
        account_status: 'active',
        blocked_at: null,
        blocked_reason: null,
      })
      .eq('id', input.userId);

    if (error) {
      console.error('[users] activate failed:', error.message);
      throw new AppError('Account kon niet worden geactiveerd.');
    }

    const service = createServiceRoleClient();
    const { error: unbanError } = await service.auth.admin.updateUserById(
      input.userId,
      { ban_duration: 'none' },
    );
    if (unbanError) {
      console.error('[users] auth unban failed:', unbanError.message);
      throw new AppError(
        'Accountstatus bijgewerkt, maar Auth-deblokkade mislukte. Probeer opnieuw.',
      );
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.account.activate',
      resourceType: 'users',
      resourceId: input.userId,
      beforeState: before,
      afterState: {
        account_status: 'active',
        blocked_at: null,
        blocked_reason: null,
      },
    });

    revalidateUserPaths(input.userId);
    return { ok: true, message: 'Account geactiveerd.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Account kon niet worden geactiveerd.'),
    };
  }
}

export async function updateUserProfileFields(input: {
  userId: string;
  name: string;
  company: string;
  phone: string;
  job_title: string;
  industry: string;
  description: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireUserMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('users')
      .select('id, name, company, phone, job_title, industry, description')
      .eq('id', input.userId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Gebruiker niet gevonden.');
    }

    const updates = {
      name: input.name.trim(),
      company: input.company.trim(),
      phone: input.phone.trim() || null,
      job_title: input.job_title.trim() || null,
      industry: input.industry.trim() || null,
      description: input.description.trim() || null,
    };

    if (!updates.name) {
      throw new AppError('Naam is verplicht.');
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', input.userId);

    if (error) {
      console.error('[users] profile update failed:', error.message);
      throw new AppError('Gegevens konden niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.profile.update',
      resourceType: 'users',
      resourceId: input.userId,
      beforeState: before,
      afterState: updates,
    });

    revalidateUserPaths(input.userId);
    return { ok: true, message: 'Gegevens opgeslagen.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Gegevens konden niet worden opgeslagen.'),
    };
  }
}

/**
 * Password recovery via Supabase Auth Admin API (generateLink).
 * Does not log the recovery URL. Does not delete or change the password directly.
 */
export async function sendUserPasswordReset(input: {
  userId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireUserMutator();
    const supabase = await createClient();

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', input.userId)
      .maybeSingle();

    if (userError || !userRow?.email) {
      throw new AppError('Gebruiker of e-mailadres niet gevonden.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_USER_APP_URL?.replace(/\/$/, '');
    const redirectTo = baseUrl ? `${baseUrl}/reset-password` : undefined;

    const service = createServiceRoleClient();
    const { data, error } = await service.auth.admin.generateLink({
      type: 'recovery',
      email: userRow.email,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (error) {
      console.error('[users] password reset link failed:', error.message);
      throw new AppError('Wachtwoordreset kon niet worden gestart.');
    }

    // Prefer Supabase-hosted recovery e-mail when possible (still Auth server).
    const { error: mailError } = await service.auth.resetPasswordForEmail(
      userRow.email,
      redirectTo ? { redirectTo } : undefined,
    );
    if (mailError) {
      console.error('[users] reset email failed:', mailError.message);
      // generateLink succeeded — still audit; warn operator about mail config
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.auth.password_reset',
      resourceType: 'auth.users',
      resourceId: input.userId,
      metadata: {
        emailDomain: userRow.email.split('@')[1] ?? null,
        linkGenerated: Boolean(data?.properties?.action_link),
        recoveryEmailAttempted: true,
        recoveryEmailOk: !mailError,
      },
    });

    revalidateUserPaths(input.userId);
    return {
      ok: true,
      message: mailError
        ? 'Resetlink aangemaakt via Auth Admin API. E-mailverzending mislukte — controleer Auth SMTP in Supabase.'
        : 'Wachtwoordreset gestart. De gebruiker ontvangt een herstelmail via Supabase Auth.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Wachtwoordreset kon niet worden gestart.'),
    };
  }
}
