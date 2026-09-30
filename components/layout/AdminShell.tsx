import Image from 'next/image';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { AdminNav, type NavEntry } from '@/components/layout/AdminNav';
import { AdminUserSearch } from '@/components/users/AdminUserSearch';
import { canViewUsers } from '@/lib/auth/permissions';
import type { AdminUser } from '@/lib/auth/types';
import { canReadCms } from '@/lib/content/types';
import { getSupportBadgeCounts } from '@/lib/nav/badges';
import { canReadSupport } from '@/lib/support/types';

type Props = {
  admin: AdminUser;
  children: React.ReactNode;
};

export async function AdminShell({ admin, children }: Props) {
  const role = admin.profile.role;
  const showSupport = canReadSupport(role);
  const showUserSearch = canViewUsers(role);
  const showCms = canReadCms(role);
  const badges = showSupport
    ? await getSupportBadgeCounts(role)
    : { appSupport: 0, webSupport: 0 };

  const entries: NavEntry[] = [
    { type: 'link', href: '/dashboard', label: 'Dashboard' },
  ];

  if (showSupport) {
    entries.push(
      {
        type: 'link',
        href: '/app-support',
        label: 'App support',
        badge: badges.appSupport,
      },
      {
        type: 'link',
        href: '/web-support',
        label: 'Web support',
        badge: badges.webSupport,
      },
    );
  }

  entries.push({ type: 'link', href: '/reviews', label: 'Reviews' });

  if (showCms) {
    entries.push({ type: 'link', href: '/content', label: 'Content' });
  }

  entries.push({ type: 'link', href: '/errors', label: 'Fouten' });

  const accountsChildren: { href: string; label: string }[] = [
    { href: '/users', label: 'Gebruikers' },
  ];
  if (role === 'superadmin') {
    accountsChildren.push({ href: '/admins', label: 'Admins' });
  }

  entries.push(
    {
      type: 'group',
      label: 'Accounts & Toegang',
      children: accountsChildren,
    },
    {
      type: 'group',
      label: 'Systeembeheer',
      children: [
        { href: '/popups', label: 'Pop-ups' },
        { href: '/audit', label: 'Audit' },
      ],
    },
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-brand-border bg-brand-navy text-brand-white lg:border-b-0 lg:border-r">
        <div className="px-5 py-6">
          <Image
            src="/logo-social-core.png"
            alt="Social Core"
            width={160}
            height={36}
            className="h-8 w-auto brightness-0 invert"
            priority
          />
          <p className="mt-3 text-sm font-medium text-white/80">
            Admin Dashboard
          </p>
        </div>
        <AdminNav entries={entries} />
      </aside>

      <div className="flex min-h-screen flex-col bg-brand-mist">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border bg-brand-white px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-brand-navy">
              {admin.fullName}
            </p>
            <p className="text-xs text-brand-accent">
              Rol: {admin.profile.role}
              {admin.platformRoleClaim
                ? ` · JWT: ${admin.platformRoleClaim}`
                : ' · JWT-claim ontbreekt (opnieuw inloggen)'}
            </p>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            {showUserSearch ? <AdminUserSearch /> : null}
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
