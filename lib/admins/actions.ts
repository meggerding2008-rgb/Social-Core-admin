'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminRole } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { AdminRole } from '@/lib/auth/types';
import { countActiveSuperadmins } from '@/lib/admins/queries';

export type ActionResult =
  | { ok: true; id?: string; message?: string }
  | { ok: false; error: string };

const ROLES: AdminRole[] = ['superadmin', 'support', 'content', 'viewer'];

function isRole(v: string): v is AdminRole {
  return (ROLES as string[]).includes(v);
}

async function syncAppMetadata(userId: string, role: AdminRole | null) {
  const service = createServiceRoleClient();
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new AppError('Auth-gebruiker niet gevonden.');
  }
  const meta = { ...(data.user.app_metadata ?? {}) } as Record<string, unknown>;
  if (role) meta.platform_role = role;
  else delete meta.platform_role;

  const { error: updateError } = await service.auth.admin.updateUserById(userId, {
    app_metadata: meta,
  });
  if (updateError) {
    console.error('[admins] app_metadata sync failed:', updateError.message);
    throw new AppError('app_metadata kon niet worden bijgewerkt.');
  }
}

export async function createAdminProfile(input: {
  email: string;
  role: string;
  displayName?: string;
}): Promise<ActionResult> {
  try {
    const actor = await requireAdminRole(['superadmin']);
    if (!isRole(input.role)) throw new AppError('Ongeldige rol.');

    const email = input.email.trim().toLowerCase();
    if (!email.includes('@')) throw new AppError('Ongeldig e-mailadres.');

    const supabase = await createClient();
    const { data: userRow } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (!userRow?.id) {
      throw new AppError(
        'Geen gebruikersprofiel met dit e-mailadres. Laat de gebruiker eerst registreren in de gebruikersapp.',
      );
    }

    const service = createServiceRoleClient();
    const { data: authData, error: authError } = await service.auth.admin.getUserById(
      userRow.id,
    );
    if (authError || !authData.user) {
      throw new AppError('Auth-account niet gevonden voor dit profiel.');
    }
    const authUser = authData.user;

    const { data: existing } = await supabase
      .from('admin_profiles')
      .select('user_id')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (existing) throw new AppError('Deze gebruiker is al admin.');

    const { error } = await supabase.from('admin_profiles').insert({
      user_id: authUser.id,
      role: input.role,
      is_active: true,
      display_name: input.displayName?.trim() || authUser.email || null,
      created_by: actor.id,
    });
    if (error) {
      console.error('[admins] create failed:', error.message);
      throw new AppError('Admin kon niet worden aangemaakt.');
    }

    await syncAppMetadata(authUser.id, input.role);

    await logAdminAction({
      actorId: actor.id,
      action: 'admin.create',
      resourceType: 'admin_profiles',
      resourceId: authUser.id,
      afterState: {
        role: input.role,
        emailDomain: email.split('@')[1],
        is_active: true,
      },
    });

    revalidatePath('/admins');
    revalidatePath(`/admins/${authUser.id}`);
    return { ok: true, id: authUser.id, message: 'Admin toegevoegd.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Admin kon niet worden aangemaakt.'),
    };
  }
}

export async function updateAdminProfile(input: {
  userId: string;
  role: string;
  isActive: boolean;
  displayName?: string;
}): Promise<ActionResult> {
  try {
    const actor = await requireAdminRole(['superadmin']);
    if (!isRole(input.role)) throw new AppError('Ongeldige rol.');

    const supabase = await createClient();
    const { data: before, error: beforeError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', input.userId)
      .maybeSingle();

    if (beforeError || !before) throw new AppError('Admin niet gevonden.');

    // Prevent self-lockout / last superadmin removal
    if (input.userId === actor.id) {
      if (!input.isActive) {
        throw new AppError('Je kunt jezelf niet deactiveren.');
      }
      if (input.role !== 'superadmin' && before.role === 'superadmin') {
        throw new AppError('Je kunt je eigen superadmin-rol niet verlagen.');
      }
    }

    if (
      before.role === 'superadmin' &&
      before.is_active &&
      (input.role !== 'superadmin' || !input.isActive)
    ) {
      const activeSupers = await countActiveSuperadmins();
      if (activeSupers <= 1) {
        throw new AppError('Er moet altijd minstens één actieve superadmin blijven.');
      }
    }

    const updates = {
      role: input.role,
      is_active: input.isActive,
      display_name: input.displayName?.trim() || before.display_name,
    };

    const { error } = await supabase
      .from('admin_profiles')
      .update(updates)
      .eq('user_id', input.userId);

    if (error) {
      console.error('[admins] update failed:', error.message);
      throw new AppError('Admin kon niet worden bijgewerkt.');
    }

    await syncAppMetadata(
      input.userId,
      input.isActive ? input.role : null,
    );

    await logAdminAction({
      actorId: actor.id,
      action: 'admin.update',
      resourceType: 'admin_profiles',
      resourceId: input.userId,
      beforeState: {
        role: before.role,
        is_active: before.is_active,
        display_name: before.display_name,
      },
      afterState: updates,
    });

    revalidatePath('/admins');
    revalidatePath(`/admins/${input.userId}`);
    return { ok: true, message: 'Admin bijgewerkt.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Admin kon niet worden bijgewerkt.'),
    };
  }
}
