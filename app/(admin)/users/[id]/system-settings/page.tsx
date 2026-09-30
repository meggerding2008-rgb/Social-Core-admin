import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManageSettings, canViewSettings } from '@/lib/auth/permissions';
import { getContentSettings } from '@/lib/user-settings/queries';
import { UserContentSettingsPanel } from '@/components/users/UserContentSettingsPanel';

export const dynamic = 'force-dynamic';

export default async function UserSystemSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewSettings(admin.profile.role)) throw new ForbiddenAdminError();

  const { row, error } = await getContentSettings(params.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">
          Systeeminstellingen
        </h2>
        <p className="text-sm text-brand-accent">
          Content- en planningsinstellingen (`content_settings`).
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <UserContentSettingsPanel
        userId={params.id}
        row={row}
        canMutate={canManageSettings(admin.profile.role)}
      />
    </div>
  );
}
