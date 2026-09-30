export const TEAM_ROLES = ['Viewer', 'Editor', 'Admin', 'Owner'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export type TeamMemberRow = {
  id: string;
  user_id: string;
  email: string | null;
  role: string | null;
  status: string | null;
  member_user_id: string | null;
  created_at: string;
  last_active: string | null;
};

export type TeamInvitationRow = {
  id: string;
  owner_user_id: string;
  invited_by: string | null;
  email: string;
  role: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

export function teamRoleLabel(role: string | null): string {
  if (!role) return '—';
  switch (role) {
    case 'Viewer':
      return 'Viewer';
    case 'Editor':
      return 'Editor';
    case 'Admin':
      return 'Beheerder';
    case 'Owner':
      return 'Eigenaar';
    default:
      return role;
  }
}

export function normalizeInviteRole(raw: string): TeamRole {
  const v = raw.trim();
  if (v === 'Beheerder') return 'Admin';
  if (v === 'Eigenaar') return 'Owner';
  if (TEAM_ROLES.includes(v as TeamRole)) return v as TeamRole;
  return 'Viewer';
}

export function isOwnerRole(role: string | null): boolean {
  return role === 'Owner' || role === 'Eigenaar';
}
