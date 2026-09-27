'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavLinkItem = {
  type: 'link';
  href: string;
  label: string;
  badge?: number;
};

export type NavGroupItem = {
  type: 'group';
  label: string;
  children: { href: string; label: string }[];
};

export type NavEntry = NavLinkItem | NavGroupItem;

type Props = {
  entries: NavEntry[];
};

function NavBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-[6px] bg-white/20 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white"
      aria-label={`${count} meldingen`}
    >
      {count}
    </span>
  );
}

function linkClass(active: boolean) {
  return `flex items-center justify-between gap-2 whitespace-nowrap rounded-[10px] px-3 py-2 text-sm ${
    active
      ? 'bg-white/15 font-medium text-white'
      : 'text-white/90 hover:bg-white/10'
  }`;
}

export function AdminNav({ entries }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
      {entries.map((entry) => {
        if (entry.type === 'link') {
          const active =
            pathname === entry.href || pathname.startsWith(`${entry.href}/`);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={linkClass(active)}
              aria-current={active ? 'page' : undefined}
            >
              <span>{entry.label}</span>
              {typeof entry.badge === 'number' ? (
                <NavBadge count={entry.badge} />
              ) : null}
            </Link>
          );
        }

        return (
          <div key={entry.label} className="mt-2 min-w-[10rem] lg:mt-4">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              {entry.label}
            </p>
            <div className="flex gap-1 lg:flex-col">
              {entry.children.map((child) => {
                const active =
                  pathname === child.href ||
                  pathname.startsWith(`${child.href}/`);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={linkClass(active)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
