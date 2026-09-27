'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPopup,
  updatePopup,
  updatePopupStatus,
} from '@/lib/popups/actions';
import {
  POPUP_AUDIENCES,
  POPUP_DISPLAY_STYLES,
  POPUP_PERSIST_UNTIL,
  POPUP_STATUSES,
  POPUP_TYPES,
  popupAudienceLabel,
  popupDisplayStyleLabel,
  popupPersistLabel,
  popupStatusLabel,
  popupTypeLabel,
  type AdminPopupRow,
  type PopupAudience,
  type PopupDisplayStyle,
  type PopupPersistUntil,
  type PopupStatus,
  type PopupType,
} from '@/lib/popups/types';

type Props = {
  mode: 'create' | 'edit';
  initial?: AdminPopupRow;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

function toLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PopupForm({ mode, initial, canMutate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [type, setType] = useState<PopupType>(initial?.type ?? 'announcement');
  const [audience, setAudience] = useState<PopupAudience>(
    initial?.audience ?? 'all',
  );
  const [audienceTier, setAudienceTier] = useState(
    initial?.audience_filter?.tier ?? 'gold',
  );
  const [audienceFeature, setAudienceFeature] = useState(
    initial?.audience_filter?.feature ?? '',
  );
  const [status, setStatus] = useState<PopupStatus>(
    initial?.status ?? 'concept',
  );
  const [displayStyle, setDisplayStyle] = useState<PopupDisplayStyle>(
    initial?.display_style ?? 'informatief',
  );
  const [startAt, setStartAt] = useState(toLocal(initial?.start_at));
  const [endAt, setEndAt] = useState(toLocal(initial?.end_at));
  const [showAfterDays, setShowAfterDays] = useState(
    initial?.show_after_days != null ? String(initial.show_after_days) : '',
  );
  const [showOnce, setShowOnce] = useState(initial?.show_once ?? true);
  const [persistUntil, setPersistUntil] = useState<PopupPersistUntil>(
    initial?.persist_until ?? 'until_dismiss_or_respond',
  );

  if (!canMutate) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5">
        <p className="text-sm text-brand-accent">Alleen leesrechten op pop-ups.</p>
      </div>
    );
  }

  function payload() {
    return {
      title,
      body,
      type,
      audience,
      audienceTier,
      audienceFeature,
      status,
      displayStyle,
      startAt: startAt || undefined,
      endAt: endAt || undefined,
      showAfterDays: showAfterDays || undefined,
      showOnce,
      persistUntil,
    };
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createPopup(payload())
          : await updatePopup({ id: initial!.id, ...payload() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      if (mode === 'create' && result.id) {
        router.push(`/popups/${result.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  function quickStatus(next: PopupStatus) {
    if (!initial?.id) return;
    setError(null);
    startTransition(async () => {
      const result = await updatePopupStatus({ id: initial.id, status: next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setStatus(next);
      setSuccess(result.message ?? 'Status bijgewerkt.');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
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

      <section className="rounded-card border border-brand-border bg-brand-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-brand-navy">Inhoud</h2>
        <label className="block text-xs font-medium text-brand-navy">
          Titel
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        </label>
        <label className="block text-xs font-medium text-brand-navy">
          Bericht
          <textarea
            required
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={field}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-brand-navy">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PopupType)}
              className={field}
            >
              {POPUP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {popupTypeLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Weergavestijl
            <select
              value={displayStyle}
              onChange={(e) =>
                setDisplayStyle(e.target.value as PopupDisplayStyle)
              }
              className={field}
            >
              {POPUP_DISPLAY_STYLES.map((s) => (
                <option key={s} value={s}>
                  {popupDisplayStyleLabel(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-brand-navy">Doelgroep & planning</h2>
        <label className="block text-xs font-medium text-brand-navy">
          Doelgroep
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as PopupAudience)}
            className={field}
          >
            {POPUP_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {popupAudienceLabel(a)}
              </option>
            ))}
          </select>
        </label>
        {audience === 'subscription' ? (
          <label className="block text-xs font-medium text-brand-navy">
            Abonnement
            <select
              value={audienceTier}
              onChange={(e) => setAudienceTier(e.target.value)}
              className={field}
            >
              <option value="silver">Zilver</option>
              <option value="gold">Goud</option>
              <option value="diamond">Diamant</option>
            </select>
          </label>
        ) : null}
        {audience === 'feature' ? (
          <label className="block text-xs font-medium text-brand-navy">
            Functie-sleutel
            <input
              value={audienceFeature}
              onChange={(e) => setAudienceFeature(e.target.value)}
              placeholder="bijv. trends"
              className={field}
            />
          </label>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-brand-navy">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PopupStatus)}
              className={field}
            >
              {POPUP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {popupStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Toon na X dagen gebruik
            <input
              type="number"
              min={0}
              value={showAfterDays}
              onChange={(e) => setShowAfterDays(e.target.value)}
              placeholder="leeg = meteen"
              className={field}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-brand-navy">
            Start
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Einde
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={field}
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-brand-navy">
          Herhaalgedrag
          <select
            value={persistUntil}
            onChange={(e) =>
              setPersistUntil(e.target.value as PopupPersistUntil)
            }
            className={field}
          >
            {POPUP_PERSIST_UNTIL.map((p) => (
              <option key={p} value={p}>
                {popupPersistLabel(p)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-navy">
          <input
            type="checkbox"
            checked={showOnce}
            onChange={(e) => setShowOnce(e.target.checked)}
          />
          Toon maximaal één keer (tenzij herhaalregel anders bepaalt)
        </label>
      </section>

      <section className="rounded-card border border-brand-border bg-brand-mist p-5">
        <h2 className="text-sm font-semibold text-brand-navy">Preview</h2>
        <div className="mt-3 rounded-[16px] border border-brand-border bg-brand-white p-4">
          <p className="text-xs uppercase tracking-wide text-brand-accent">
            {popupTypeLabel(type)} · {popupDisplayStyleLabel(displayStyle)}
          </p>
          <p className="mt-2 text-base font-semibold text-brand-navy">
            {title || 'Titel'}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-navy">
            {body || 'Bericht…'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-[10px] border border-brand-navy bg-brand-navy px-3 py-1.5 text-xs text-white">
              Primaire actie
            </span>
            <span className="rounded-[10px] border border-brand-border px-3 py-1.5 text-xs text-brand-accent">
              Niet nu
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
        >
          {pending ? 'Bezig…' : mode === 'create' ? 'Pop-up opslaan' : 'Wijzigingen opslaan'}
        </button>
        {mode === 'edit' && initial ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => quickStatus('actief')}
              className="rounded-[10px] border border-brand-navy px-4 py-2 text-sm text-brand-navy hover:bg-brand-mist"
            >
              Activeren
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => quickStatus('gepauzeerd')}
              className="rounded-[10px] border border-brand-border px-4 py-2 text-sm text-brand-accent hover:bg-brand-mist"
            >
              Pauzeren
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => quickStatus('gearchiveerd')}
              className="rounded-[10px] border border-brand-border px-4 py-2 text-sm text-brand-accent hover:bg-brand-mist"
            >
              Archiveren
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
