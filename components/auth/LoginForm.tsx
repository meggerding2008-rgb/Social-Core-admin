'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Props = {
  nextPath?: string;
  error?: string;
};

export function LoginForm({ nextPath, error }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(error ?? null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setFormError(signInError.message);
        setPending(false);
        return;
      }

      const destination =
        nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
          ? nextPath
          : '/dashboard';

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Inloggen mislukt. Probeer opnieuw.',
      );
      setPending(false);
    }
  }

  const fieldClass =
    'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-accent';

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-card border border-brand-border bg-brand-white p-6 sm:p-8"
    >
      {formError ? (
        <div
          className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {formError}
        </div>
      ) : null}

      <label className="block text-sm font-medium text-brand-navy">
        E-mail
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </label>

      <label className="mt-4 block text-sm font-medium text-brand-navy">
        Wachtwoord
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2.5 text-sm font-semibold text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Bezig…' : 'Inloggen'}
      </button>
    </form>
  );
}
