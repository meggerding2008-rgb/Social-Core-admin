import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseEnv } from './env';

/**
 * Service-role client — server only.
 * Use exclusively for Auth Admin API and documented exceptions.
 * Never import from Client Components.
 */
export function createServiceRoleClient() {
  const { url } = getSupabaseEnv();
  return createClient(url, getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
