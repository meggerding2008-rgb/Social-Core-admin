'use server';

import { requireAdmin } from '@/lib/auth/require-admin';
import { canViewUsers } from '@/lib/auth/permissions';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';
import { listUsers } from '@/lib/users/queries';

export type UserSearchHit = {
  id: string;
  label: string;
  email: string | null;
};

export async function searchUsersForAdminNav(
  q: string,
): Promise<
  { ok: true; rows: UserSearchHit[] } | { ok: false; error: string }
> {
  try {
    const admin = await requireAdmin();
    if (!canViewUsers(admin.profile.role)) {
      throw new AppError('Geen toegang tot gebruikerszoeken.');
    }

    const query = q.trim();
    if (query.length < 2) {
      throw new AppError('Typ minstens 2 tekens.');
    }

    const { rows, error } = await listUsers({ q: query, plan: 'all', status: 'all' });
    if (error) throw new AppError(error);

    return {
      ok: true,
      rows: rows.slice(0, 12).map((row) => ({
        id: row.id,
        label: [row.name, row.company].filter(Boolean).join(' · ') || row.email || row.id,
        email: row.email,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Zoeken mislukt.'),
    };
  }
}
