const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUserId(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function normalizeUserId(value: string | undefined | null): string | null {
  if (!isUserId(value)) return null;
  return value.trim().toLowerCase();
}
