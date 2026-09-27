import Link from 'next/link';
import type { AdminPopupRow } from '@/lib/popups/types';
import {
  popupAudienceLabel,
  popupStatusLabel,
  popupTypeLabel,
} from '@/lib/popups/types';
import { formatSupportDateTime } from '@/lib/support/labels';

type Props = { rows: AdminPopupRow[] };

export function PopupList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center">
        <p className="text-sm font-medium text-brand-navy">Geen pop-ups</p>
        <p className="mt-1 text-sm text-brand-accent">
          Maak een pop-up aan of pas filters aan.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-brand-border bg-brand-white">
      <ul className="divide-y divide-brand-border">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/popups/${row.id}`}
              className="block px-4 py-4 transition hover:bg-brand-mist/70"
            >
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    {row.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-brand-accent">
                    {popupTypeLabel(row.type)} · {popupAudienceLabel(row.audience)}
                    {row.start_at
                      ? ` · start ${formatSupportDateTime(row.start_at)}`
                      : ''}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-[8px] border border-brand-border px-2 py-0.5 text-xs font-medium text-brand-navy">
                  {popupStatusLabel(row.status)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
