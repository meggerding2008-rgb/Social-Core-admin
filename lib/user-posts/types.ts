export const POST_STATUSES = [
  'concept',
  'goedgekeurd',
  'gepland',
  'gepubliceerd',
  'afgewezen',
  'gearchiveerd',
  'mislukt',
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export type UserPostRow = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  platforms: string[] | null;
  status: string | null;
  hashtags: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
  is_favorite: boolean;
  x_publish_error: string | null;
  linkedin_publish_error: string | null;
  facebook_publish_error: string | null;
  instagram_publish_error: string | null;
  threads_publish_error: string | null;
};

export function postStatusLabel(status: string | null | undefined): string {
  switch (String(status ?? '').toLowerCase()) {
    case 'concept':
      return 'Concept';
    case 'goedgekeurd':
      return 'Goedgekeurd';
    case 'gepland':
      return 'Gepland';
    case 'gepubliceerd':
      return 'Gepubliceerd';
    case 'afgewezen':
      return 'Afgewezen';
    case 'gearchiveerd':
      return 'Gearchiveerd';
    case 'mislukt':
      return 'Mislukt';
    default:
      return status?.trim() || '—';
  }
}

export function publishErrors(row: UserPostRow): string[] {
  return [
    row.facebook_publish_error && `Facebook: ${row.facebook_publish_error}`,
    row.instagram_publish_error && `Instagram: ${row.instagram_publish_error}`,
    row.threads_publish_error && `Threads: ${row.threads_publish_error}`,
    row.x_publish_error && `X: ${row.x_publish_error}`,
    row.linkedin_publish_error && `LinkedIn: ${row.linkedin_publish_error}`,
  ].filter(Boolean) as string[];
}
