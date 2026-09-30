'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  inviteTeamMember,
  removeTeamMember,
  revokeInvitation,
  updateTeamMemberRole,
} from '@/lib/user-team/actions';
import {
  TEAM_ROLES,
  teamRoleLabel,
  type TeamInvitationRow,
  type TeamMemberRow,
} from '@/lib/user-team/types';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = {
  ownerUserId: string;
  members: TeamMemberRow[];
  invitations: TeamInvitationRow[];
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function UserTeamPanel({
  ownerUserId,
  members,
  invitations,
  canMutate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: '', role: 'Viewer' });

  function run(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Actie mislukt.');
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      router.refresh();
    });
  }

  function onInvite(event: FormEvent) {
    event.preventDefault();
    run(() =>
      inviteTeamMember({
        ownerUserId,
        email: invite.email,
        role: invite.role,
      }),
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <h3 className="text-sm font-semibold text-brand-navy">Teamleden</h3>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-brand-accent">Geen teamleden.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm text-brand-navy">{m.email || '—'}</p>
                  <p className="text-xs text-brand-accent">
                    {teamRoleLabel(m.role)} · {m.status || '—'}
                    {m.last_active
                      ? ` · actief ${formatSupportDateTime(m.last_active)}`
                      : ''}
                  </p>
                </div>
                {canMutate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={m.role ?? 'Viewer'}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          updateTeamMemberRole({
                            ownerUserId,
                            memberId: m.id,
                            role: e.target.value,
                          }),
                        )
                      }
                      className="rounded-[10px] border border-brand-border px-2 py-1 text-xs"
                    >
                      {TEAM_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {teamRoleLabel(r)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          removeTeamMember({
                            ownerUserId,
                            memberId: m.id,
                          }),
                        )
                      }
                      className="text-xs text-red-800 hover:underline"
                    >
                      Verwijderen
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <h3 className="text-sm font-semibold text-brand-navy">
          Openstaande uitnodigingen
        </h3>
        {invitations.length === 0 ? (
          <p className="mt-2 text-sm text-brand-accent">Geen uitnodigingen.</p>
        ) : (
          <ul className="mt-3 divide-y divide-brand-border">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div>
                  <p className="text-sm text-brand-navy">{inv.email}</p>
                  <p className="text-xs text-brand-accent">
                    {teamRoleLabel(inv.role)} · verloopt{' '}
                    {inv.expires_at
                      ? formatSupportDateTime(inv.expires_at)
                      : '—'}
                  </p>
                </div>
                {canMutate ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        revokeInvitation({
                          ownerUserId,
                          invitationId: inv.id,
                        }),
                      )
                    }
                    className="text-xs text-brand-navy hover:text-brand-accent"
                  >
                    Intrekken
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canMutate ? (
        <form
          onSubmit={onInvite}
          className="rounded-card border border-brand-border bg-brand-white p-5"
        >
          <h3 className="text-sm font-semibold text-brand-navy">
            Uitnodigen
          </h3>
          <p className="mt-1 text-xs text-brand-accent">
            Geen e-mail vanuit admin; acceptatie via gebruikersapp.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-brand-navy">
              E-mail
              <input
                type="email"
                required
                value={invite.email}
                onChange={(e) =>
                  setInvite((prev) => ({ ...prev, email: e.target.value }))
                }
                className={field}
              />
            </label>
            <label className="block text-xs font-medium text-brand-navy">
              Rol
              <select
                value={invite.role}
                onChange={(e) =>
                  setInvite((prev) => ({ ...prev, role: e.target.value }))
                }
                className={field}
              >
                {TEAM_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {teamRoleLabel(r)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white hover:bg-brand-accent disabled:opacity-60"
          >
            {pending ? 'Bezig…' : 'Uitnodiging opslaan'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
