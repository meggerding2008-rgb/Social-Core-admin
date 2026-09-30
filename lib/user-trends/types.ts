export const TREND_STATUSES = [
  'nieuw',
  'groeiend',
  'actueel',
  'afnemend',
  'verlopen',
  'onvoldoende_onderbouwd',
] as const;

export type TrendStatus = (typeof TREND_STATUSES)[number];

export type UserTrendRow = {
  id: string;
  user_id: string;
  platform: string;
  title: string;
  summary: string | null;
  status: string;
  relevance_score: number;
  opportunity_score: number;
  branche: string;
  detected_at: string;
  expires_at: string | null;
  source_url: string | null;
  updated_at: string;
};

export function trendStatusLabel(status: string): string {
  switch (status) {
    case 'nieuw':
      return 'Nieuw';
    case 'groeiend':
      return 'Groeiend';
    case 'actueel':
      return 'Actueel';
    case 'afnemend':
      return 'Afnemend';
    case 'verlopen':
      return 'Verlopen';
    case 'onvoldoende_onderbouwd':
      return 'Onvoldoende onderbouwd';
    default:
      return status;
  }
}
