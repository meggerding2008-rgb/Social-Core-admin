import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getDashboardData } from '@/lib/dashboard/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireAdmin();
  const { cards, actions, activity, system } = await getDashboardData();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          Overzicht van wat aandacht nodig heeft — live data, geen mockdata.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Overzicht
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-card border border-brand-border bg-brand-white p-4 transition hover:border-brand-accent"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-brand-navy">
                {card.value}
              </p>
              {card.hint ? (
                <p className="mt-1 text-xs text-brand-accent">{card.hint}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-brand-border bg-brand-white p-5">
          <h2 className="text-sm font-semibold text-brand-navy">
            Wat moet ik doen?
          </h2>
          {actions.length === 0 ? (
            <p className="mt-4 text-sm text-brand-accent">
              Geen openstaande acties gevonden.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-brand-border">
              {actions.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="block py-3 transition hover:bg-brand-mist/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-brand-navy">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-brand-accent">
                          {item.meta}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-[8px] border px-2 py-0.5 text-[10px] font-medium uppercase ${
                          item.urgency === 'high'
                            ? 'border-red-200 text-red-700'
                            : item.urgency === 'medium'
                              ? 'border-brand-accent/40 text-brand-accent'
                              : 'border-brand-border text-brand-accent'
                        }`}
                      >
                        {item.urgency === 'high'
                          ? 'Hoog'
                          : item.urgency === 'medium'
                            ? 'Midden'
                            : 'Laag'}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-brand-border bg-brand-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand-navy">
              Wat gebeurt er?
            </h2>
            <Link
              href="/audit"
              className="text-xs font-medium text-brand-accent hover:text-brand-navy"
            >
              Alle auditlogs
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="mt-4 text-sm text-brand-accent">
              Nog geen recente auditactiviteit.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-brand-border">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="block py-3 transition hover:bg-brand-mist/50"
                  >
                    <p className="text-sm font-medium text-brand-navy">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-accent">
                      {item.meta} · {formatSupportDateTime(item.at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-card border border-brand-border bg-brand-white p-5">
        <h2 className="text-sm font-semibold text-brand-navy">Systeemstatus</h2>
        <p className="mt-1 text-xs text-brand-accent">
          Gebaseerd op timestamps in bestaande tabellen. Ontbrekende data = geen
          toegang of nog geen sync.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {system.map((item) => (
            <li
              key={item.label}
              className="rounded-[10px] border border-brand-border px-3 py-3"
            >
              <p className="text-xs uppercase tracking-wide text-brand-accent">
                {item.label}
              </p>
              <p className="mt-1 text-sm text-brand-navy">{item.value}</p>
              {item.ok === false ? (
                <p className="mt-1 text-xs text-red-700">Aandacht aanbevolen</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
