'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserDetailNavTab } from '@/lib/users/tabs';

type Props = {
  tabs: UserDetailNavTab[];
};

export function UserDetailTabs({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      aria-label="Gebruikerssecties"
    >
      {tabs.map((tab) => {
        const active =
          tab.id === 'overview'
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.id}
            href={tab.href}
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
