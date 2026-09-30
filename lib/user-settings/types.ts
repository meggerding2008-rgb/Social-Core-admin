export type ContentSettingsRow = {
  id: string;
  user_id: string;
  brand_name: string | null;
  brand_description: string | null;
  brand_voice: string | null;
  target_audience: string | null;
  scheduling_mode: string | null;
  generation_timezone: string | null;
  updated_at: string | null;
};

export type ContentSettingsPatch = {
  brand_name?: string;
  brand_description?: string;
  brand_voice?: string;
  target_audience?: string;
  scheduling_mode?: string;
  generation_timezone?: string;
};
