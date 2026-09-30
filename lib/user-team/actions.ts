'use server';

import { createHash, randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canManageTeams } from '@/lib/auth/permissions';
import { logAdminAction } from '@/lib/audit/log';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { createClient } from '@/lib/supabase/server';
import { countTeamOwners } from '@/lib/user-team/queries';
import {
  isOwnerRole,
  normalizeInviteRole,
  type TeamRole,
} from '@/lib/user-team/types';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

async function requireTeamMutator() {
  const admin = await requireAdmin();
  if (!canManageTeams(admin.profile.role)) {
    throw new AppError('Je hebt geen rechten om teamleden te beheren.');
  }
  return admin;
}

function revalidateTeamPaths(ownerUserId: string) {
  revalidatePath(`/users/${ownerUserId}`);
  revalidatePath(`/users/${ownerUserId}/team`);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function inviteTeamMember(input: {
  ownerUserId: string;
  email: string;
  role: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireTeamMutator();
    const email = input.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw new AppError('Geldig e-mailadres is verplicht.');
    }

    const role: TeamRole = normalizeInviteRole(input.role);
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        owner_user_id: input.ownerUserId,
        invited_by: admin.id,
        email,
        role,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[user-team] invite failed:', error?.message);
      throw new AppError('Uitnodiging kon niet worden opgeslagen.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.team.invite',
      resourceType: 'team_invitations',
      resourceId: data.id,
      afterState: { email, role, owner_user_id: input.ownerUserId },
      metadata: { expires_at: expiresAt },
    });

    revalidateTeamPaths(input.ownerUserId);
    return {
      ok: true,
      message:
        'Uitnodiging opgeslagen. Acceptatie gebeurt via de gebruikersapp (token niet in admin getoond).',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Uitnodiging mislukt.'),
    };
  }
}

export async function revokeInvitation(input: {
  ownerUserId: string;
  invitationId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireTeamMutator();
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('team_invitations')
      .select('id, email, role, owner_user_id')
      .eq('id', input.invitationId)
      .eq('owner_user_id', input.ownerUserId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Uitnodiging niet gevonden.');
    }

    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', input.invitationId)
      .eq('owner_user_id', input.ownerUserId);

    if (error) {
      throw new AppError('Uitnodiging kon niet worden ingetrokken.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.team.invite_revoke',
      resourceType: 'team_invitations',
      resourceId: input.invitationId,
      beforeState: before,
      metadata: { ownerUserId: input.ownerUserId },
    });

    revalidateTeamPaths(input.ownerUserId);
    return { ok: true, message: 'Uitnodiging ingetrokken.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Intrekken mislukt.'),
    };
  }
}

export async function removeTeamMember(input: {
  ownerUserId: string;
  memberId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireTeamMutator();
    const supabase = await createClient();

    const { data: member, error: memberError } = await supabase
      .from('team')
      .select('id, user_id, email, role')
      .eq('id', input.memberId)
      .eq('user_id', input.ownerUserId)
      .maybeSingle();

    if (memberError || !member) {
      throw new AppError('Teamlid niet gevonden.');
    }

    if (isOwnerRole(member.role)) {
      const owners = await countTeamOwners(input.ownerUserId);
      if (owners <= 1) {
        throw new AppError(
          'De laatste eigenaar kan niet worden verwijderd.',
        );
      }
    }

    const { error } = await supabase
      .from('team')
      .delete()
      .eq('id', input.memberId)
      .eq('user_id', input.ownerUserId);

    if (error) {
      throw new AppError('Teamlid kon niet worden verwijderd.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.team.member_remove',
      resourceType: 'team',
      resourceId: input.memberId,
      beforeState: member,
      metadata: { ownerUserId: input.ownerUserId },
    });

    revalidateTeamPaths(input.ownerUserId);
    return { ok: true, message: 'Teamlid verwijderd.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Verwijderen mislukt.'),
    };
  }
}

export async function updateTeamMemberRole(input: {
  ownerUserId: string;
  memberId: string;
  role: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireTeamMutator();
    const role = normalizeInviteRole(input.role);
    const supabase = await createClient();

    const { data: before, error: beforeError } = await supabase
      .from('team')
      .select('id, user_id, email, role')
      .eq('id', input.memberId)
      .eq('user_id', input.ownerUserId)
      .maybeSingle();

    if (beforeError || !before) {
      throw new AppError('Teamlid niet gevonden.');
    }

    if (isOwnerRole(before.role) && !isOwnerRole(role)) {
      const owners = await countTeamOwners(input.ownerUserId);
      if (owners <= 1) {
        throw new AppError(
          'De rol van de laatste eigenaar kan niet worden verlaagd.',
        );
      }
    }

    const { error } = await supabase
      .from('team')
      .update({ role })
      .eq('id', input.memberId)
      .eq('user_id', input.ownerUserId);

    if (error) {
      throw new AppError('Rol kon niet worden bijgewerkt.');
    }

    await logAdminAction({
      actorId: admin.id,
      action: 'user.team.member_role',
      resourceType: 'team',
      resourceId: input.memberId,
      beforeState: before,
      afterState: { role },
      metadata: { ownerUserId: input.ownerUserId },
    });

    revalidateTeamPaths(input.ownerUserId);
    return { ok: true, message: 'Rol bijgewerkt.' };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Rol bijwerken mislukt.'),
    };
  }
}