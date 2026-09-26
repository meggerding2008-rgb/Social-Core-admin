export type AdminRole = 'superadmin' | 'support' | 'content' | 'viewer';

export type AdminProfile = {
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type AdminUser = {
  id: string;
  email: string | null;
  /** Resolved display name: users.name → user_metadata → email. */
  fullName: string;
  profile: AdminProfile;
  /** Mirrored claim from JWT app_metadata (may lag until re-login). */
  platformRoleClaim: string | null;
};
