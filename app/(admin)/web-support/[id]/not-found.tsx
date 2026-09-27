import Link from 'next/link';

export default function WebSupportNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-card border border-brand-border bg-brand-white px-6 py-10 text-center">
      <h1 className="text-xl font-semibold text-brand-navy">
        Websitebericht niet gevonden
      </h1>
      <p className="mt-2 text-sm text-brand-accent">
        Dit bericht bestaat niet of is niet zichtbaar met jouw rechten.
      </p>
      <Link
        href="/web-support"
        className="mt-5 inline-block rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent"
      >
        Naar Web support
      </Link>
    </div>
  );
}
