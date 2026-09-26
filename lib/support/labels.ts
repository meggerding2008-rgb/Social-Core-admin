import type { SupportMessageStatus } from '@/lib/support/types';

export function getSupportStatusLabel(status: SupportMessageStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_behandeling':
      return 'In behandeling';
    case 'beantwoord':
      return 'Beantwoord';
    case 'opgelost':
      return 'Opgelost';
    case 'gesloten':
      return 'Gesloten';
    default:
      return status;
  }
}

export function formatSupportDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncateText(value: string, max = 120): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
