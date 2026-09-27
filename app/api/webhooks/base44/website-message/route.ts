import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_SUBJECT = 300;
const MAX_MESSAGE = 10000;
const MAX_EXTERNAL_ID = 200;

type CanonicalPayload = {
  external_id?: string;
  sender_name: string;
  sender_email: string;
  subject?: string;
  message: string;
  submitted_at?: string;
};

function jsonError(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status });
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function extractSecret(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  const header = request.headers.get('x-socialcore-webhook-secret');
  return header?.trim() || null;
}

function verifyOptionalHmac(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const hmacSecret = process.env.BASE44_WEBHOOK_HMAC_SECRET?.trim();
  if (!hmacSecret) return true;
  if (!signatureHeader) return false;

  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  const expected = createHmac('sha256', hmacSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  try {
    return safeEqual(provided, expected);
  } catch {
    return false;
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parsePayload(body: unknown): CanonicalPayload | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Body must be a JSON object.' };
  }
  const raw = body as Record<string, unknown>;

  const sender_name =
    typeof raw.sender_name === 'string'
      ? raw.sender_name.trim()
      : typeof raw.name === 'string'
        ? raw.name.trim()
        : '';
  const sender_email =
    typeof raw.sender_email === 'string'
      ? raw.sender_email.trim()
      : typeof raw.email === 'string'
        ? raw.email.trim()
        : '';
  const message =
    typeof raw.message === 'string'
      ? raw.message.trim()
      : typeof raw.body === 'string'
        ? raw.body.trim()
        : '';
  const subject =
    typeof raw.subject === 'string' ? raw.subject.trim() : undefined;
  const external_id =
    typeof raw.external_id === 'string'
      ? raw.external_id.trim()
      : typeof raw.id === 'string'
        ? raw.id.trim()
        : undefined;
  const submitted_at =
    typeof raw.submitted_at === 'string' ? raw.submitted_at : undefined;

  if (!sender_name || sender_name.length > MAX_NAME) {
    return { error: 'Invalid sender_name.' };
  }
  if (
    !sender_email ||
    sender_email.length > MAX_EMAIL ||
    !sender_email.includes('@')
  ) {
    return { error: 'Invalid sender_email.' };
  }
  if (!message || message.length > MAX_MESSAGE) {
    return { error: 'Invalid message.' };
  }
  if (subject && subject.length > MAX_SUBJECT) {
    return { error: 'Invalid subject.' };
  }
  if (external_id && external_id.length > MAX_EXTERNAL_ID) {
    return { error: 'Invalid external_id.' };
  }

  return {
    external_id: external_id || undefined,
    sender_name,
    sender_email: normalizeEmail(sender_email),
    subject: subject || undefined,
    message,
    submitted_at,
  };
}

/**
 * Base44 → admin webhook for website contact forms.
 * Auth: Bearer / X-SocialCore-Webhook-Secret + optional HMAC.
 * Idempotent on external_id.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.BASE44_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) {
    console.error('[webhook/base44] BASE44_WEBHOOK_SECRET is not configured');
    return jsonError(503, 'Webhook not configured.');
  }

  const provided = extractSecret(request);
  if (!provided || !safeEqual(provided, expectedSecret)) {
    return jsonError(401, 'Unauthorized.');
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError(400, 'Could not read body.');
  }

  const signature =
    request.headers.get('x-webhook-signature') ||
    request.headers.get('x-base44-signature');
  if (!verifyOptionalHmac(rawBody, signature)) {
    return jsonError(401, 'Invalid signature.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return jsonError(400, 'Invalid JSON.');
  }

  const payload = parsePayload(parsedJson);
  if ('error' in payload) {
    return jsonError(400, payload.error);
  }

  let service;
  try {
    service = createServiceRoleClient();
  } catch (error) {
    console.error('[webhook/base44] service role unavailable', error);
    return jsonError(503, 'Service unavailable.');
  }

  // Idempotency: existing external_id
  if (payload.external_id) {
    const { data: existing } = await service
      .from('website_messages')
      .select('id')
      .eq('external_id', payload.external_id)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        id: existing.id,
      });
    }
  }

  // Optional user match on email
  const { data: matchedUser } = await service
    .from('users')
    .select('id')
    .ilike('email', payload.sender_email)
    .limit(1)
    .maybeSingle();

  const insertRow = {
    sender_name: payload.sender_name,
    sender_email: payload.sender_email,
    subject: payload.subject ?? null,
    message: payload.message,
    status: 'nieuw',
    source: 'base44_website',
    user_id: matchedUser?.id ?? null,
    external_id: payload.external_id ?? null,
    payload: {
      received_at: new Date().toISOString(),
      submitted_at: payload.submitted_at ?? null,
      // Store a sanitized copy of inbound fields (no secrets)
      canonical: {
        sender_name: payload.sender_name,
        sender_email: payload.sender_email,
        subject: payload.subject ?? null,
        message: payload.message,
        external_id: payload.external_id ?? null,
      },
    },
  };

  const { data: inserted, error } = await service
    .from('website_messages')
    .insert(insertRow)
    .select('id')
    .single();

  if (error) {
    // Unique violation on external_id → treat as duplicate
    if (error.code === '23505' && payload.external_id) {
      const { data: again } = await service
        .from('website_messages')
        .select('id')
        .eq('external_id', payload.external_id)
        .maybeSingle();
      if (again?.id) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          id: again.id,
        });
      }
    }
    console.error('[webhook/base44] insert failed:', error.message);
    return jsonError(500, 'Could not store message.');
  }

  const actorId = process.env.WEBHOOK_AUDIT_ACTOR_ID?.trim();
  if (actorId && inserted?.id) {
    const { error: auditError } = await service.from('admin_audit_logs').insert({
      actor_id: actorId,
      action: 'web_support.webhook.ingest',
      resource_type: 'website_messages',
      resource_id: inserted.id,
      after_state: {
        sender_email: payload.sender_email,
        external_id: payload.external_id ?? null,
        user_id: matchedUser?.id ?? null,
      },
      metadata: {
        source: 'base44_webhook',
        matched_user: Boolean(matchedUser?.id),
      },
    });
    if (auditError) {
      console.error('[webhook/base44] audit failed:', auditError.message);
    }
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}

export async function GET() {
  return jsonError(405, 'Method not allowed.');
}
