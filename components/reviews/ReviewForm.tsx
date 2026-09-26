'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createContentReview,
  updateContentReview,
  updateContentReviewStatus,
} from '@/lib/reviews/actions';
import {
  REVIEW_STATUSES,
  reviewStatusLabel,
  type ContentReviewRow,
  type ReviewStatus,
} from '@/lib/reviews/types';
import { reviewFrequencyLabel } from '@/lib/reviews/frequency';

type UserOption = {
  id: string;
  label: string;
  tier: string;
  email: string | null;
};

type Props = {
  mode: 'create' | 'edit';
  users: UserOption[];
  initial?: ContentReviewRow;
  defaultUserId?: string;
  canMutate: boolean;
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

function defaultPeriodStart(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
}

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReviewForm({
  mode,
  users,
  initial,
  defaultUserId,
  canMutate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userId, setUserId] = useState(
    initial?.user_id ?? defaultUserId ?? '',
  );
  const selected = useMemo(
    () => users.find((u) => u.id === userId),
    [users, userId],
  );
  const [tier, setTier] = useState(
    () =>
      initial?.subscription_tier ||
      users.find((u) => u.id === (initial?.user_id ?? defaultUserId))?.tier ||
      'silver',
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [status, setStatus] = useState<ReviewStatus>(
    initial?.status ?? 'concept',
  );
  const [periodStart, setPeriodStart] = useState(
    initial?.period_start ?? defaultPeriodStart(),
  );
  const [periodEnd, setPeriodEnd] = useState(
    initial?.period_end ?? new Date().toISOString().slice(0, 10),
  );
  const [scheduledFor, setScheduledFor] = useState(
    toLocalInputValue(initial?.scheduled_for),
  );
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [whatWentWell, setWhatWentWell] = useState(
    initial?.what_went_well ?? '',
  );
  const [improvementPoints, setImprovementPoints] = useState(
    initial?.improvement_points ?? '',
  );
  const [performanceAnalysis, setPerformanceAnalysis] = useState(
    initial?.performance_analysis ?? '',
  );
  const [recommendations, setRecommendations] = useState(
    initial?.recommendations ?? '',
  );
  const [recommendedContentTypes, setRecommendedContentTypes] = useState(
    initial?.recommended_content_types ?? '',
  );
  const [recommendedPostingFrequency, setRecommendedPostingFrequency] =
    useState(initial?.recommended_posting_frequency ?? '');
  const [platformRecommendations, setPlatformRecommendations] = useState(
    initial?.platform_recommendations ?? '',
  );
  const [conclusion, setConclusion] = useState(initial?.conclusion ?? '');

  if (!canMutate) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5">
        <p className="text-sm text-brand-accent">
          Je hebt alleen leesrechten op reviews.
        </p>
      </div>
    );
  }

  function onUserChange(id: string) {
    setUserId(id);
    const u = users.find((x) => x.id === id);
    if (u) setTier(u.tier);
  }

  function payload() {
    return {
      userId,
      title,
      status,
      subscriptionTier: tier,
      periodStart,
      periodEnd,
      summary,
      whatWentWell,
      improvementPoints,
      performanceAnalysis,
      recommendations,
      recommendedContentTypes,
      recommendedPostingFrequency,
      platformRecommendations,
      conclusion,
      scheduledFor: scheduledFor || undefined,
    };
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createContentReview(payload())
          : await updateContentReview({ id: initial!.id, ...payload() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      if (mode === 'create' && result.id) {
        router.push(`/reviews/${result.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  function quickStatus(next: ReviewStatus) {
    if (!initial?.id) return;
    setError(null);
    startTransition(async () => {
      const result = await updateContentReviewStatus({
        id: initial.id,
        status: next,
        scheduledFor: scheduledFor || undefined,
      });
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
        <h2 className="text-sm font-semibold text-brand-navy">Basis</h2>
        <label className="block text-xs font-medium text-brand-navy">
          Gebruiker
          <select
            required
            value={userId}
            onChange={(e) => onUserChange(e.target.value)}
            disabled={mode === 'edit'}
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
        {selected || tier ? (
          <p className="text-xs text-brand-accent">
            Abonnement / frequentie: {reviewFrequencyLabel(tier)}
          </p>
        ) : null}
        <label className="block text-xs font-medium text-brand-navy">
          Titel
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
            placeholder="Contentreview Q1 2026"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-brand-navy">
            Analyseperiode van
            <input
              type="date"
              required
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className={field}
            />
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Analyseperiode tot
            <input
              type="date"
              required
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className={field}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-brand-navy">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReviewStatus)}
              className={field}
            >
              {REVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {reviewStatusLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-brand-navy">
            Geplande verzenddatum
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className={field}
            />
          </label>
        </div>
        <p className="text-xs text-brand-accent">
          Concept en gepland triggeren geen notificatie. Pas bij status
          Verzonden ontvangt de gebruiker een melding via de bestaande
          notificatiestructuur. Sla eerst als concept op als je later wilt
          versturen.
        </p>
      </section>

      <section className="rounded-card border border-brand-border bg-brand-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-brand-navy">Inhoud</h2>
        {(
          [
            ['Belangrijkste resultaten / samenvatting', summary, setSummary],
            ['Wat ging goed', whatWentWell, setWhatWentWell],
            ['Wat beter kan', improvementPoints, setImprovementPoints],
            [
              'Analyse van contentprestaties',
              performanceAnalysis,
              setPerformanceAnalysis,
            ],
            [
              'Aanbevelingen voor likes, reacties en bereik',
              recommendations,
              setRecommendations,
            ],
            [
              'Aanbevolen contenttypes',
              recommendedContentTypes,
              setRecommendedContentTypes,
            ],
            [
              'Aanbevolen postingfrequentie',
              recommendedPostingFrequency,
              setRecommendedPostingFrequency,
            ],
            [
              'Platformspecifieke aanbevelingen',
              platformRecommendations,
              setPlatformRecommendations,
            ],
            ['Algemene conclusie', conclusion, setConclusion],
          ] as const
        ).map(([label, value, setter]) => (
          <label key={label} className="block text-xs font-medium text-brand-navy">
            {label}
            <textarea
              rows={3}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className={field}
            />
          </label>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-accent disabled:opacity-60"
        >
          {pending ? 'Bezig…' : mode === 'create' ? 'Opslaan' : 'Wijzigingen opslaan'}
        </button>
        {mode === 'edit' && initial ? (
          <>
            <button
              type="button"
              disabled={pending || status === 'verzonden'}
              onClick={() => quickStatus('verzonden')}
              className="rounded-[10px] border border-brand-navy px-4 py-2 text-sm text-brand-navy hover:bg-brand-mist disabled:opacity-50"
            >
              Markeer als verzonden
            </button>
            <button
              type="button"
              disabled={pending || status === 'geannuleerd'}
              onClick={() => quickStatus('geannuleerd')}
              className="rounded-[10px] border border-brand-border px-4 py-2 text-sm text-brand-accent hover:bg-brand-mist disabled:opacity-50"
            >
              Annuleren
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
