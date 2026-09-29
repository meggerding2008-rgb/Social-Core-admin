import Link from 'next/link';

type Props = {
  userId: string;
  title: string;
  phase: number;
  description?: string;
};

/** Placeholder until the matching implementation phase lands. */
export function UserSectionPlaceholder({
  userId,
  title,
  phase,
  description,
}: Props) {
  return (
    <div className="rounded-card border border-brand-border bg-brand-white px-5 py-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
        Fase {phase}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-brand-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-brand-accent">
        {description ??
          'Deze sectie wordt in een latere fase aangesloten op bestaande tabellen en syncfuncties. Geen mockdata.'}
      </p>
      <Link
        href={`/users/${userId}`}
        className="mt-4 inline-block text-sm font-medium text-brand-navy hover:text-brand-accent"
      >
        ← Terug naar overzicht
      </Link>
    </div>
  );
}
