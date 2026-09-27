'use client';

import Link from 'next/link';
import type { WebsiteMessageRow } from '@/lib/web-support/types';
import { websiteMessageStatusLabel } from '@/lib/web-support/types';
import {
  formatSupportDateTime,
  truncateText,
} from '@/lib/support/labels';

type Props = {
  rows: WebsiteMessageRow[];
};

export function WebSupportList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center">
        <p className="text-sm font-medium text-brand-navy">
          Geen websiteberichten gevonden
        </p>
        <p className="mt-1 text-sm text-brand-accent">
          Nieuwe berichten via Base44 verschijnen hier.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-brand-border bg-brand-white">
      <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto_auto] gap-3 border-b border-brand-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-accent lg:grid">
        <span>Afzender</span>
        <span>Onderwerp / bericht</span>
        <span>Status</span>
        <span>Datum</span>
      </div>

      <ul className="divide-y divide-brand-border">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/web-support/${row.id}`}
              className="block px-4 py-4 transition hover:bg-brand-mist/70"
            >
              <div className="grid gap-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto_auto] lg:items-center lg:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    {row.sender_name}
                  </p>
                  <p className="truncate text-xs text-brand-accent">
                    {row.sender_email}
                  </p>
                  {row.users ? (
                    <p className="mt-0.5 text-xs text-brand-accent">
                      Gekoppeld: {row.users.name || row.users.email}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    {row.subject?.trim() || 'Geen onderwerp'}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-brand-accent lg:line-clamp-1">
                    {truncateText(row.message, 140)}
                  </p>
                </div>
                <span className="inline-flex rounded-[8px] border border-brand-border px-2 py-0.5 text-xs text-brand-navy">
                  {websiteMessageStatusLabel(row.status)}
                </span>
                <p className="text-xs text-brand-accent lg:text-right">
                  {formatSupportDateTime(row.created_at)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
