'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
import { canViewStatistics } from '@/lib/auth/permissions';
import { AppError, toSafeErrorMessage } from '@/lib/errors/safe-error';

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function revalidateUserStatistics(input: {
  userId: string;
}): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!canViewStatistics(admin.profile.role)) {
      throw new AppError('Geen rechten voor statistieken.');
    }

    revalidatePath(`/users/${input.userId}/statistics`);
    return {
      ok: true,
      message:
        'Weergave vernieuwd. Synchronisatie met platforms gebeurt in de gebruikersapp — niet via admin.',
    };
  } catch (error) {
    return {
      ok: false,
      error: toSafeErrorMessage(error, 'Vernieuwen mislukt.'),
    };
  }
}
