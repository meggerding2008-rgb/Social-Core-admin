'use server';

import { requireAdmin } from '@/lib/auth/require-admin';
import { canImpersonate } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ImpersonationResult =
  | { ok: true; actionLink: string; message: string }
  | { ok: false; error: string };

/**
 * Start impersonation: magic link via Auth Admin API (superadmin only).
 * Returns action_link for manual open — never auto-navigates, never exposes password.
 * End impersonation: admin closes user session / signs out in user app (optional audit via logImpersonationEnd).
 */
export async function startImpersonation(input: {
  userId: string;
}): Promise<ImpersonationResult> {
  try {
    const admin = await requireAdmin();
    if (!canImpersonate(admin.profile.role)) {
      throw new AppError('Alleen superadmins mogen impersoneren.');
    }
    if (input.userId === admin.id) {
      throw new AppError('Je kunt jezelf niet impersoneren.');
    }

    const supabase = await createClient();
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', input.userId)
      .maybeSingle();

    if (userError || !userRow?.email) {
      throw new AppError('Gebruiker of e-mailadres niet gevonden.');
    }

    const baseUrl = process.env.NEXT_PUBLIC_USER_APP_URL?.replace(/\/$/, '');
    const redirectTo = baseUrl ? `${baseUrl}/dashboard` : undefined;

    const service = createServiceRoleClient();
    const { data, error } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email: userRow.email,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (error || !data?.properties?.action_link) {
      console.error('[impersonation] generateLink failed:', error?.message);
      throw new AppError('Impersonatie-link kon niet worden aangemaakt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.impersonation.start',
      resourceType: 'users',
      resourceId: input.userId,
      metadata: {
        targetEmailDomain: userRow.email.split('@')[1] ?? null,
        redirectTo: redirectTo ?? null,
      },
    });

    return {
      ok: true,
      actionLink: data.properties.action_link,
      message:
        'Magic link aangemaakt. Open in een apart venster; sluit de sessie in de gebruikersapp om te stoppen.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Impersonatie mislukt.'),
    };
  }
}

export async function logImpersonationEnd(input: {
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = await requireAdmin();
    if (!canImpersonate(admin.profile.role)) {
      throw new AppError('Geen rechten.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.impersonation.end',
      resourceType: 'users',
      resourceId: input.userId,
      metadata: { note: 'Handmatig gemeld door admin' },
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Loggen mislukt.'),
    };
  }
}
