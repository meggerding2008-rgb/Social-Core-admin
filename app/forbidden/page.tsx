import Image from 'next/image';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';

export default function ForbiddenPage() {
  return (
    <main className="sc-honeycomb flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md rounded-card border border-brand-border bg-brand-white p-8 text-center">
        <Image
          src="/logo-social-core.png"
          alt="Social Core"
          width={180}
          height={40}
          className="mx-auto h-9 w-auto"
          priority
        />
        <h1 className="mt-6 text-2xl font-semibold text-brand-navy">
          Geen toegang
        </h1>
        <p className="mt-3 text-sm text-brand-accent">
          Je bent ingelogd, maar dit account is geen actieve platformbeheerder.
          Neem contact op met een superadmin als je toegang nodig hebt.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-[10px] border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:border-brand-accent hover:bg-brand-mist"
          >
            Terug naar login
          </Link>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
