'use client';

import { FormEvent, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { contactUserFromAdmin } from '@/lib/support/actions';

type UserOption = { id: string; label: string };

type Props = {
  users: UserOption[];
  defaultUserId?: string;
  lockUser?: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function ContactUserForm({ users, defaultUserId, lockUser }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState(defaultUserId ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const requestIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `req-${Date.now()}`,
  );
  const formId = useId();
  const submittedRef = useRef(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending || submittedRef.current) return;
    submittedRef.current = true;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await contactUserFromAdmin({
        userId,
        subject,
        message,
        clientRequestId: requestIdRef.current,
      });
      if (!result.ok) {
        submittedRef.current = false;
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Bericht verzonden.');
      if (result.id) {
        router.push(`/app-support/${result.id}`);
        router.refresh();
      } else {
        router.push('/app-support');
        router.refresh();
      }
    });
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div
          className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-card border border-brand-border bg-brand-mist px-4 py-3 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <label className="block text-xs font-medium text-brand-navy">
        Gebruiker
        <select
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={lockUser || pending}
          className={field}
        >
          <option value="">Selecteer…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium text-brand-navy">
        Onderwerp
        <input
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={pending}
          maxLength={200}
          className={field}
          placeholder="Bijv. Tip voor je LinkedIn-planning"
        />
      </label>

      <label className="block text-xs font-medium text-brand-navy">
        Bericht
        <textarea
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={pending}
          className={field}
        />
      </label>

      <p className="text-xs text-brand-accent">
        De gebruiker ziet dit op de Supportpagina en krijgt een in-app
        notificatie. Er wordt geen aparte e-mailflow gestart.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
      >
        {pending ? 'Verzenden…' : 'Bericht verzenden'}
      </button>
    </form>
  );
}
