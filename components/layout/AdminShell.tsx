import Image from 'next/image';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { AdminNav } from '@/components/layout/AdminNav';
import type { AdminUser } from '@/lib/auth/types';

type NavItem = {
  href: string;
  label: string;
  superadminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/users', label: 'Gebruikers' },
  { href: '/support', label: 'Support' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/content', label: 'Content' },
  { href: '/broadcasts', label: 'Broadcasts' },
  { href: '/errors', label: 'Fouten' },
  { href: '/audit', label: 'Audit' },
  { href: '/admins', label: 'Admins', superadminOnly: true },
];

type Props = {
  admin: AdminUser;
  children: React.ReactNode;
};

export function AdminShell({ admin, children }: Props) {
  const items = NAV.filter(
    (item) => !item.superadminOnly || admin.profile.role === 'superadmin',
  ).map(({ href, label }) => ({ href, label }));

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
        <AdminNav items={items} />
      </aside>

      <div className="flex min-h-screen flex-col bg-brand-mist">
        <header className="flex items-center justify-between gap-4 border-b border-brand-border bg-brand-white px-5 py-4">
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
          <SignOutButton />
        </header>
        <main className="flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
