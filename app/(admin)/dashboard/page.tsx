import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getDashboardData,
  type DashboardCard,
} from '@/lib/dashboard/queries';
import { formatSupportDateTime } from '@/lib/support/labels';

export const dynamic = 'force-dynamic';

function CardGrid({
  cards,
  columns,
}: {
  cards: DashboardCard[];
  columns: string;
}) {
  return (
    <div className={`grid gap-3 ${columns}`}>
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
  );
}

export default async function DashboardPage() {
  await requireAdmin();
  const {
    userCards,
    opsCards,
    popupDetailCards,
    actions,
    activity,
    system,
  } = await getDashboardData();

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-brand-accent">
          Overzicht van wat aandacht nodig heeft — live data, geen mockdata.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Gebruikers & abonnementen
        </h2>
        <div className="rounded-card border border-brand-border bg-brand-white/60 p-4">
          <CardGrid cards={userCards} columns="sm:grid-cols-3" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-accent">
          Operationeel
        </h2>
        <div className="rounded-card border border-brand-border bg-brand-white/60 p-4 space-y-4">
          <CardGrid
            cards={opsCards}
            columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          />
          <div className="border-t border-brand-border pt-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brand-accent">
              Pop-up details
            </p>
            <CardGrid
              cards={popupDetailCards}
              columns="sm:grid-cols-2 lg:grid-cols-4"
            />
          </div>
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
                            ? 'border-brand-navy/40 text-brand-navy'
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
                <p className="mt-1 text-xs text-brand-accent">Aandacht aanbevolen</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
