/**
 * Brevo Transactional Email — server-only.
 * Never import from Client Components.
 */

const BREVO_SMTP_URL = 'https://api.brevo.com/v3/smtp/email';

export type BrevoSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string; status?: number };

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail =
    process.env.BREVO_FROM_EMAIL?.trim() || 'info@socialcore.nl';
  const fromName = process.env.BREVO_FROM_NAME?.trim() || 'Social Core';

  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  return { apiKey, fromEmail, fromName };
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
  // Practical validation — not full RFC
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Send a transactional email via Brevo.
 * Does not log the API key or full request headers.
 */
export async function sendBrevoTransactionalEmail(input: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}): Promise<BrevoSendResult> {
  let config: ReturnType<typeof getBrevoConfig>;
  try {
    config = getBrevoConfig();
  } catch {
    return { ok: false, error: 'E-mailverzending is niet geconfigureerd.' };
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
  } catch (error) {
    console.error('[brevo] network error');
    return { ok: false, error: 'Brevo is tijdelijk niet bereikbaar.' };
  }

  if (!response.ok) {
    // Do not log response body (may contain PII); status only.
    console.error('[brevo] send rejected:', response.status);
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: 'Brevo-authenticatie mislukt. Controleer BREVO_API_KEY op Vercel.',
        status: response.status,
      };
    }
    if (response.status === 400) {
      return {
        ok: false,
        error:
          'Brevo weigerde het bericht. Controleer of info@socialcore.nl als afzender is geverifieerd.',
        status: response.status,
      };
    }
    return {
      ok: false,
      error: 'E-mail kon niet worden verzonden via Brevo.',
      status: response.status,
    };
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
