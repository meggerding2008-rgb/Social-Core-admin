'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminProfile, updateAdminProfile } from '@/lib/admins/actions';
import type { AdminRole } from '@/lib/auth/types';

const ROLES: AdminRole[] = ['superadmin', 'support', 'content', 'viewer'];

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function AdminCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('support');
  const [displayName, setDisplayName] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createAdminProfile({ email, role, displayName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.id) router.replace(`/admins/${result.id}`);
      else router.push('/admins');
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
      {error ? <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      <label className="block text-xs font-medium text-brand-navy">
        E-mail (bestaand Auth-account)
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={field} />
      </label>
      <label className="block text-xs font-medium text-brand-navy">
        Weergavenaam
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={field} />
      </label>
      <label className="block text-xs font-medium text-brand-navy">
        Rol
        <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={field}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm text-white hover:bg-brand-accent disabled:opacity-60">
        {pending ? 'Bezig…' : 'Admin toevoegen'}
      </button>
    </form>
  );
}

export function AdminEditForm({
  userId,
  initialRole,
  initialActive,
  initialName,
}: {
  userId: string;
  initialRole: AdminRole;
  initialActive: boolean;
  initialName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [role, setRole] = useState(initialRole);
  const [isActive, setIsActive] = useState(initialActive);
  const [displayName, setDisplayName] = useState(initialName);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateAdminProfile({
        userId,
        role,
        isActive,
        displayName,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
      {error ? <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">{success}</div> : null}
      <label className="block text-xs font-medium text-brand-navy">
        Weergavenaam
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={field} />
      </label>
      <label className="block text-xs font-medium text-brand-navy">
        Rol
        <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} className={field}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-brand-navy">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-brand-navy" />
        Actief
      </label>
      <button type="submit" disabled={pending} className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm text-white hover:bg-brand-accent disabled:opacity-60">
        {pending ? 'Bezig…' : 'Opslaan'}
      </button>
    </form>
  );
}
