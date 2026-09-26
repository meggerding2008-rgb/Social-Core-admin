import { createClient } from '@/lib/supabase/server';

export type AuditLogInput = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Persist an admin mutation. Call after every successful write.
 * Uses the caller JWT (RLS: actor_id must equal auth.uid()).
 */
export async function logAdminAction(input: AuditLogInput): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('admin_audit_logs').insert({
    actor_id: input.actorId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    before_state: input.beforeState ?? null,
    after_state: input.afterState ?? null,
    metadata: input.metadata ?? {},
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });

  if (error) {
    console.error('[audit] failed to write admin_audit_logs', error.message);
    throw new Error(`Audit log failed: ${error.message}`);
  }
}
