import Image from 'next/image';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="sc-honeycomb flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo-social-core.png"
            alt="Social Core"
            width={220}
            height={48}
            priority
            className="h-10 w-auto sm:h-12"
          />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-brand-navy">
            Admin
          </h1>
          <p className="mt-2 text-sm text-brand-accent/80">
            Alleen toegankelijk voor platformbeheerders.
          </p>
        </div>
        <LoginForm nextPath={searchParams.next} error={searchParams.error} />
      </div>
    </main>
  );
}
