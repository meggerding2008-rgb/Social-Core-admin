export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code = 'app_error') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

/** User-facing message only — never leak secrets or raw infra errors. */
export function toSafeErrorMessage(
  error: unknown,
  fallback = 'Er ging iets mis. Probeer het opnieuw.',
): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'name' in error) {
    const name = String((error as { name?: string }).name);
    if (name === 'AuthRequiredError') {
      return 'Je moet opnieuw inloggen.';
    }
    if (name === 'ForbiddenAdminError') {
      return 'Je hebt geen rechten voor deze actie.';
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes('jwt') ||
      msg.includes('permission') ||
      msg.includes('row-level security') ||
      msg.includes('rls')
    ) {
      return 'Deze actie is niet toegestaan.';
    }
  }

  console.error('[safe-error]', error instanceof Error ? error.message : error);
  return fallback;
}
