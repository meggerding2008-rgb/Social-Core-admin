'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateErrorReport } from '@/lib/errors/actions';
import {
  ERROR_SEVERITIES,
  ERROR_STATUSES,
  errorStatusLabel,
  type ErrorReportRow,
} from '@/lib/errors/types';

type Props = {
  report: ErrorReportRow;
  canMutate: boolean;
  assignees: { id: string; label: string }[];
};

const field =
  'mt-1 w-full rounded-[10px] border border-brand-border bg-brand-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-accent';

export function ErrorActions({ report, canMutate, assignees }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState(report.status);
  const [severity, setSeverity] = useState(report.severity);
  const [assignee, setAssignee] = useState(report.assignee_admin_id ?? '');
  const [note, setNote] = useState('');

  if (!canMutate) {
    return (
      <div className="rounded-card border border-brand-border bg-brand-white p-5 text-sm text-brand-accent">
        Alleen lezen voor jouw rol.
      </div>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateErrorReport({
        id: report.id,
        status,
        severity,
        assigneeAdminId: assignee || null,
        internalNote: note || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? 'Opgeslagen.');
      setNote('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="rounded-card border border-brand-border bg-brand-white p-5 space-y-3">
      {error ? <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="rounded-[10px] border border-brand-border bg-brand-mist px-3 py-2 text-sm text-brand-navy">{success}</div> : null}

      <label className="block text-xs font-medium text-brand-navy">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={field}>
          {ERROR_STATUSES.map((s) => (
            <option key={s} value={s}>{errorStatusLabel(s)}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-brand-navy">
        Severity
        <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className={field}>
          {ERROR_SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-brand-navy">
        Toewijzen aan
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={field}>
          <option value="">Niet toegewezen</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-brand-navy">
        Interne notitie
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={field} />
      </label>
      <button type="submit" disabled={pending} className="rounded-[10px] border border-brand-navy bg-brand-navy px-4 py-2 text-sm text-white hover:bg-brand-accent disabled:opacity-60">
        {pending ? 'Bezig…' : 'Opslaan'}
      </button>
    </form>
  );
}
