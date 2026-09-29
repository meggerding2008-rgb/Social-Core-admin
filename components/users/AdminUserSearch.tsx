'use client';

import { FormEvent, useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { searchUsersForAdminNav } from '@/lib/users/search-action';

type Hit = {
  id: string;
  label: string;
  email: string | null;
};

export function AdminUserSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    if (!query) return;
    setError(null);
    startTransition(async () => {
      const result = await searchUsersForAdminNav(query);
      if (!result.ok) {
        setError(result.error);
        setHits([]);
        setOpen(true);
        return;
      }
      setHits(result.rows);
      setOpen(true);
      if (result.rows.length === 1) {
        router.push(`/users/${result.rows[0].id}`);
        setOpen(false);
      }
    });
  }

  return (
    <div ref={boxRef} className="relative min-w-[12rem] flex-1 max-w-sm">
      <form onSubmit={onSubmit} className="flex gap-1">
        <label className="sr-only" htmlFor={`${listId}-q`}>
          Zoek gebruiker
        </label>
        <input
          id={`${listId}-q`}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Zoek gebruiker…"
          className="w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-1.5 text-sm text-brand-navy outline-none focus:border-brand-accent"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={pending || !q.trim()}
          className="rounded-[10px] border border-brand-border px-3 py-1.5 text-sm font-medium text-brand-navy hover:bg-brand-mist disabled:opacity-50"
        >
          {pending ? '…' : 'Zoek'}
        </button>
      </form>

      {open ? (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-auto rounded-[10px] border border-brand-border bg-brand-white shadow-md">
          {error ? (
            <p className="px-3 py-2 text-sm text-red-700">{error}</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-brand-accent">
              Geen gebruikers gevonden
            </p>
          ) : (
            <ul>
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-mist"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/users/${hit.id}`);
                    }}
                  >
                    <span className="font-medium text-brand-navy">
                      {hit.label}
                    </span>
                    {hit.email ? (
                      <span className="mt-0.5 block text-xs text-brand-accent">
                        {hit.email}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
