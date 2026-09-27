import { formatSupportDateTime } from '@/lib/support/labels';
import type { WebsiteMessageReplyRow } from '@/lib/web-support/types';

type Props = {
  rows: WebsiteMessageReplyRow[];
  error?: string | null;
};

export function WebSupportReplyHistory({ rows, error }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-brand-navy">
        Antwoordgeschiedenis
      </h2>

      {error ? (
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {rows.length === 0 && !error ? (
        <div className="rounded-card border border-brand-border bg-brand-white px-5 py-8 text-center">
          <p className="text-sm text-brand-accent">
            Nog geen e-mailantwoorden verzonden.
          </p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-card border border-brand-border bg-brand-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-brand-accent">
                  Naar {row.recipient_email} ·{' '}
                  {formatSupportDateTime(row.sent_at)}
                </p>
                <span className="rounded-[8px] border border-brand-border px-2 py-0.5 text-[10px] font-medium uppercase text-brand-navy">
                  {row.delivery_status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-brand-navy">
                {row.message}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
