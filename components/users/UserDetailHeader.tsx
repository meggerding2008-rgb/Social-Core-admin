import Link from 'next/link';
import type { UserProfileRow } from '@/lib/users/types';
import { AccountStatusBadge } from '@/components/users/AccountStatusBadge';
import { UserDetailTabs } from '@/components/users/UserDetailTabs';
import type { UserDetailNavTab } from '@/lib/users/tabs';

type Props = {
  user: UserProfileRow;
  tabs: UserDetailNavTab[];
  children: React.ReactNode;
};

export function UserDetailHeader({ user, tabs, children }: Props) {
  const label = user.name?.trim() || user.email || 'Gebruiker';

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Link
          href="/users"
          className="text-sm font-medium text-brand-accent hover:text-brand-navy"
        >
          ← Terug naar gebruikers
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
                {label}
              </h1>
              <AccountStatusBadge status={user.account_status} />
            </div>
            <p className="mt-1 text-sm text-brand-accent">{user.email || '—'}</p>
            {user.company ? (
              <p className="text-xs text-brand-accent">{user.company}</p>
            ) : null}
            <p className="mt-1 font-mono text-[11px] text-brand-accent/80">
              user_id: {user.id}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-brand-border bg-brand-white px-2 py-2 sm:px-3">
        <UserDetailTabs tabs={tabs} />
      </div>

      {children}
    </div>
  );
}
