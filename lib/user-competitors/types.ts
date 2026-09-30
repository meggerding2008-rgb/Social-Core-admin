export type CompetitorRow = {
  id: string;
  user_id: string;
  competitor_name: string;
  name: string | null;
  website_url: string | null;
  industry: string | null;
  description: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  pinterest_url: string | null;
  x_url: string | null;
  followers: number;
  engagement_rate: number;
  posts_per_week: number;
  growth_rate: number;
  top_content_type: string;
  best_posting_time: string;
  analysis_status: string;
  updated_at: string;
  created_at: string;
};

export function displayCompetitorName(row: CompetitorRow): string {
  return row.name?.trim() || row.competitor_name;
}
