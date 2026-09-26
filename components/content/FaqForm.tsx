'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createFaqItem, updateFaqItem } from '@/lib/content/actions';
import type { FaqItemRow } from '@/lib/content/types';

type Props = {
  mode: 'create' | 'edit';
  initial?: FaqItemRow;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function FaqForm({ mode, initial, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [displayOrder, setDisplayOrder] = useState(
    String(initial?.display_order ?? 0),
  );
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);

  if (!canMutate) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5 text-sm text-brand-accent">
        Alleen lezen — geen CMS-mutaties voor jouw rol.
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const order = Number.parseInt(displayOrder, 10);

    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createFaqItem({
              question,
              answer,
              category,
              displayOrder: Number.isFinite(order) ? order : 0,
              isPublished,
            })
          : await updateFaqItem({
              id: initial!.id,
              question,
              answer,
              category,
              displayOrder: Number.isFinite(order) ? order : 0,
              isPublished,
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      if (mode === 'create' && result.id) {
        router.replace(`/content/faq/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div
          className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">
          {success}
        </div>
      ) : null}

      <div className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
        <label className="block text-xs font-medium text-brand-navy">
          Vraag (titel)
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            className={field}
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Antwoord (platte tekst, geen HTML)
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            rows={8}
            className={field}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-brand-navy">
            Categorie
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={field}
              placeholder="Bijv. Account"
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Volgorde
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 accent-brand-navy"
            />
            Gepubliceerd
          </label>
        </div>
      </div>

      <div className="rounded-card border border-brand-border bg-brand-mist p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
          Preview
        </p>
        <p className="mt-2 text-sm font-medium text-brand-navy">
          {question || 'Vraag…'}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy">
          {answer || 'Antwoord…'}
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
      >
        {pending ? 'Bezig…' : mode === 'create' ? 'FAQ aanmaken' : 'Opslaan'}
      </button>
    </form>
  );
}
