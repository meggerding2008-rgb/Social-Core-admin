import {
  ForbiddenAdminError,
  requireAdmin,
} from '@/lib/auth/require-admin';
import { canManageTeams, canViewTeams } from '@/lib/auth/permissions';
import {
  listTeamInvitations,
  listTeamMembers,
} from '@/lib/user-team/queries';
import { UserTeamPanel } from '@/components/users/UserTeamPanel';

export const dynamic = 'force-dynamic';

export default async function UserTeamPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = await requireAdmin();
  if (!canViewTeams(admin.profile.role)) throw new ForbiddenAdminError();

  const [membersResult, invitationsResult] = await Promise.all([
    listTeamMembers(params.id),
    listTeamInvitations(params.id),
  ]);

  const error = membersResult.error || invitationsResult.error;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Team</h2>
        <p className="text-sm text-brand-accent">
          Teamleden en uitnodigingen voor accounteigenaar {params.id}.
        </p>
      </div>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <UserTeamPanel
        ownerUserId={params.id}
        members={membersResult.rows}
        invitations={invitationsResult.rows}
        canMutate={canManageTeams(admin.profile.role)}
      />
    </div>
  );
}
