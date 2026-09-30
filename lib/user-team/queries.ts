import { createClient } from '@/lib/supabase/server';
import type { TeamInvitationRow, TeamMemberRow } from '@/lib/user-team/types';

function mapMember(raw: Record<string, unknown>): TeamMemberRow | null {
  if (typeof raw.id !== 'string' || typeof raw.user_id !== 'string') return null;
  return {
    id: raw.id,
    user_id: raw.user_id,
    email: typeof raw.email === 'string' ? raw.email : null,
    role: typeof raw.role === 'string' ? raw.role : null,
    status: typeof raw.status === 'string' ? raw.status : null,
    member_user_id:
      typeof raw.member_user_id === 'string' ? raw.member_user_id : null,
    created_at: String(raw.created_at ?? ''),
    last_active: typeof raw.last_active === 'string' ? raw.last_active : null,
  };
}

function mapInvitation(raw: Record<string, unknown>): TeamInvitationRow | null {
  if (typeof raw.id !== 'string' || typeof raw.email !== 'string') return null;
  const owner =
    typeof raw.owner_user_id === 'string'
      ? raw.owner_user_id
      : typeof raw.user_id === 'string'
        ? raw.user_id
        : null;
  if (!owner) return null;

  return {
    id: raw.id,
    owner_user_id: owner,
    invited_by: typeof raw.invited_by === 'string' ? raw.invited_by : null,
    email: raw.email,
    role: typeof raw.role === 'string' ? raw.role : null,
    expires_at: typeof raw.expires_at === 'string' ? raw.expires_at : null,
    accepted_at: typeof raw.accepted_at === 'string' ? raw.accepted_at : null,
    created_at: String(raw.created_at ?? ''),
  };
}

export async function listTeamMembers(
  ownerUserId: string,
): Promise<{ rows: TeamMemberRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('team')
    .select(
      'id, user_id, email, role, status, member_user_id, created_at, last_active',
    )
    .eq('user_id', ownerUserId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.error('[user-team] members failed:', error.message);
    return {
      rows: [],
      error: 'Teamleden konden niet worden geladen.',
    };
  }

  const rows = (data ?? [])
    .map((item) => mapMember(item as Record<string, unknown>))
    .filter((row): row is TeamMemberRow => row !== null);

  return { rows, error: null };
}

export async function listTeamInvitations(
  ownerUserId: string,
): Promise<{ rows: TeamInvitationRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('team_invitations')
    .select(
      'id, owner_user_id, invited_by, email, role, expires_at, accepted_at, created_at',
    )
    .eq('owner_user_id', ownerUserId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[user-team] invitations failed:', error.message);
    return { rows: [], error: 'Uitnodigingen konden niet worden geladen.' };
  }

  const rows = (data ?? [])
    .map((item) => mapInvitation(item as Record<string, unknown>))
    .filter((row): row is TeamInvitationRow => row !== null);

  return { rows, error: null };
}

export async function countTeamOwners(ownerUserId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('team')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ownerUserId)
    .in('role', ['Owner', 'Eigenaar']);

  if (error) {
    console.error('[user-team] owner count failed:', error.message);
    return 0;
  }
  return count ?? 0;
}
