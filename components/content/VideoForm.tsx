'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createVideoTutorial,
  updateVideoTutorial,
} from '@/lib/content/actions';
import type { VideoTutorialRow } from '@/lib/content/types';
import { getVideoPreviewHref } from '@/lib/content/types';

type Props = {
  mode: 'create' | 'edit';
  initial?: VideoTutorialRow;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function VideoForm({ mode, initial, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnail_url ?? '');
  const [duration, setDuration] = useState(initial?.duration ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
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
      const payload = {
        title,
        videoUrl,
        thumbnailUrl,
        duration,
        description,
        category,
        displayOrder: Number.isFinite(order) ? order : 0,
        isPublished,
      };
      const result =
        mode === 'create'
          ? await createVideoTutorial(payload)
          : await updateVideoTutorial({ id: initial!.id, ...payload });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      if (mode === 'create' && result.id) {
        router.replace(`/content/videos/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  const preview = getVideoPreviewHref(videoUrl);

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
          Titel
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={field}
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Beschrijving (platte tekst)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={field}
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Video-URL
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            required
            className={field}
            placeholder="https://…"
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Thumbnail-URL
          <input
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            required
            className={field}
            placeholder="https://…"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs font-medium text-brand-navy">
            Duur
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
              className={field}
              placeholder="3:20"
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Categorie
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={field}
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
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-navy">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 accent-brand-navy"
          />
          Gepubliceerd
        </label>
      </div>

      <div className="rounded-card border border-brand-border bg-brand-mist p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
          Preview
        </p>
        <p className="mt-2 text-sm font-medium text-brand-navy">
          {title || 'Titel…'}
        </p>
        {preview ? (
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm font-medium text-brand-accent hover:text-brand-navy"
          >
            Previewlink openen ↗
          </a>
        ) : (
          <p className="mt-2 text-sm text-brand-accent">Nog geen geldige URL</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-brand-white transition hover:border-brand-accent hover:bg-brand-accent disabled:opacity-60"
      >
        {pending ? 'Bezig…' : mode === 'create' ? 'Video aanmaken' : 'Opslaan'}
      </button>
    </form>
  );
}
