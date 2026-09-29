'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserDetailTab } from '@/lib/users/tabs';

type Props = {
  userId: string;
  tabs: UserDetailTab[];
};

export function UserDetailTabs({ userId, tabs }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      aria-label="Gebruikerssecties"
    >
      {tabs.map((tab) => {
        const href = tab.href(userId);
        const active =
          tab.id === 'overview'
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={tab.id}
            href={href}
            className={`whitespace-nowrap rounded-[10px] px-3 py-2 text-sm ${
              active
                ? 'bg-brand-navy font-medium text-white'
                : 'text-brand-navy hover:bg-brand-mist'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
