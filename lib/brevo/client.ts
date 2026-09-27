/**
 * Brevo Transactional Email — server-only.
 * Never import from Client Components.
 * Never log BREVO_API_KEY or request headers containing it.
 */

const BREVO_SMTP_URL = 'https://api.brevo.com/v3/smtp/email';

export type BrevoSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string; status?: number; code?: string };

/** Strip quotes/whitespace that often sneak into dashboard-pasted env values. */
function sanitizeEnv(value: string | undefined): string {
  if (!value) return '';
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  // Remove BOM / zero-width chars without touching the secret content meaningfully
  v = v.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  return v;
}

function getBrevoConfig():
  | {
      ok: true;
      apiKey: string;
      fromEmail: string;
      fromName: string;
    }
  | { ok: false; error: string } {
  const apiKey = sanitizeEnv(process.env.BREVO_API_KEY);
  const fromEmail =
    sanitizeEnv(process.env.BREVO_FROM_EMAIL) || 'info@socialcore.nl';
  const fromName =
    sanitizeEnv(process.env.BREVO_FROM_NAME) || 'Social Core';

  if (!apiKey) {
    return {
      ok: false,
      error:
        'BREVO_API_KEY ontbreekt in de server-omgeving. Zet deze op Vercel (Production) en deploy opnieuw.',
    };
  }

  if (!apiKey.startsWith('xkeysib-')) {
    return {
      ok: false,
      error:
        'BREVO_API_KEY heeft een onverwacht formaat. Gebruik een Brevo API-key (xkeysib-…) zonder aanhalingstekens.',
    };
  }

  return { ok: true, apiKey, fromEmail, fromName };
}

/** Escape plain text for safe HTML email body. */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\r\n|\r|\n/g, '<br />');
}

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type BrevoErrorBody = {
  code?: string;
  message?: string;
};

async function readBrevoError(
  response: Response,
): Promise<BrevoErrorBody> {
  try {
    const json = (await response.json()) as BrevoErrorBody;
    return {
      code: typeof json.code === 'string' ? json.code : undefined,
      message:
        typeof json.message === 'string'
          ? json.message.slice(0, 200)
          : undefined,
    };
  } catch {
    return {};
  }
}

function mapBrevoHttpError(
  status: number,
  body: BrevoErrorBody,
): BrevoSendResult {
  const code = body.code;
  const msg = (body.message || '').toLowerCase();

  // Safe server log: status + code only (never API key, never full headers)
  console.error('[brevo] send rejected', { status, code: code ?? null });

  if (status === 401 || status === 403) {
    if (msg.includes('unrecognised ip') || msg.includes('unrecognized ip')) {
      return {
        ok: false,
        status,
        code,
        error:
          'Brevo weigert dit IP-adres voor de API-key. Schakel IP-restrictie uit in Brevo (SMTP & API → API Keys), of voeg dit IP toe. Op Vercel wisselen IPs — IP-allowlisting werkt daar meestal niet.',
      };
    }
    return {
      ok: false,
      status,
      code,
      error:
        'Brevo-authenticatie mislukt (ongeldige of geblokkeerde API-key). Controleer BREVO_API_KEY op Vercel Production en of de key actief is.',
    };
  }

  if (status === 400) {
    if (msg.includes('sender') || msg.includes('from')) {
      return {
        ok: false,
        status,
        code,
        error:
          'Brevo weigerde de afzender. Controleer of info@socialcore.nl als authenticated sender is ingesteld.',
      };
    }
    return {
      ok: false,
      status,
      code,
      error:
        'Brevo weigerde het bericht (ongeldige request). Controleer ontvanger en afzender.',
    };
  }

  return {
    ok: false,
    status,
    code,
    error: 'E-mail kon niet worden verzonden via Brevo.',
  };
}

/**
 * Send a transactional email via Brevo.
 * Server-side only. Header: api-key (not Authorization Bearer).
 */
export async function sendBrevoTransactionalEmail(input: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}): Promise<BrevoSendResult> {
  const config = getBrevoConfig();
  if (!config.ok) {
    return { ok: false, error: config.error };
  }

  if (!isValidEmail(input.toEmail)) {
    return { ok: false, error: 'Ongeldig ontvangeradres.' };
  }

  const body = {
    sender: {
      name: config.fromName,
      email: config.fromEmail,
    },
    to: [
      {
        email: input.toEmail.trim().toLowerCase(),
        ...(input.toName?.trim()
          ? { name: input.toName.trim().slice(0, 200) }
          : {}),
      },
    ],
    subject: input.subject.slice(0, 300),
    htmlContent: input.htmlContent,
  };

  let response: Response;
  try {
    response = await fetch(BREVO_SMTP_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch {
    console.error('[brevo] network error');
    return { ok: false, error: 'Brevo is tijdelijk niet bereikbaar.' };
  }

  if (!response.ok) {
    const errBody = await readBrevoError(response);
    return mapBrevoHttpError(response.status, errBody);
  }

  let messageId: string | null = null;
  try {
    const json = (await response.json()) as { messageId?: string };
    messageId = typeof json.messageId === 'string' ? json.messageId : null;
  } catch {
    messageId = null;
  }

  return { ok: true, messageId };
}
