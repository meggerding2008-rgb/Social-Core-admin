import { createClient } from '@/lib/supabase/server';
import type { AdminProfile, AdminRole, AdminUser } from '@/lib/auth/types';

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class ForbiddenAdminError extends Error {
  constructor(message = 'Platform admin access required') {
    super(message);
    this.name = 'ForbiddenAdminError';
  }
}

function isAdminRole(value: unknown): value is AdminRole {
  return (
    value === 'superadmin' ||
    value === 'support' ||
    value === 'content' ||
    value === 'viewer'
  );
}

/**
 * Server-side gate: valid session + active row in admin_profiles.
 * Always re-check the table (do not rely on app_metadata alone).
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthRequiredError();
  }

  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select(
      'user_id, role, is_active, display_name, created_at, updated_at, created_by',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`admin_profiles lookup failed: ${profileError.message}`);
  }

  if (!profile || profile.is_active !== true || !isAdminRole(profile.role)) {
    throw new ForbiddenAdminError();
  }

  const claim = user.app_metadata?.platform_role;
  const platformRoleClaim = typeof claim === 'string' ? claim : null;

  const { data: userRow } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .maybeSingle();

  const fullName = resolveAdminFullName({
    usersName: typeof userRow?.name === 'string' ? userRow.name : null,
    userMetadata: user.user_metadata as Record<string, unknown> | undefined,
    email: user.email ?? null,
  });

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    profile: profile as AdminProfile,
    platformRoleClaim,
  };
}

/** Prefer public.users.name, then Auth user_metadata, then email. */
export function resolveAdminFullName(input: {
  usersName: string | null;
  userMetadata?: Record<string, unknown> | null;
  email: string | null;
}): string {
  const fromUsers = input.usersName?.trim();
  if (fromUsers) return fromUsers;

  const meta = input.userMetadata ?? {};
  const full =
    typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  if (full) return full;

  const first =
    typeof meta.first_name === 'string' ? meta.first_name.trim() : '';
  const last =
    typeof meta.last_name === 'string' ? meta.last_name.trim() : '';
  const combined = [first, last].filter(Boolean).join(' ').trim();
  if (combined) return combined;

  const email = input.email?.trim();
  if (email) return email;

  return 'Admin';
}

export async function requireAdminRole(
  allowed: AdminRole[],
): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (!allowed.includes(admin.profile.role)) {
    throw new ForbiddenAdminError(
      `Role "${admin.profile.role}" is not allowed for this action`,
    );
  }
  return admin;
}
