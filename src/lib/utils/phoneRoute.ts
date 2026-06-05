export function encodePhoneForRoute(e164: string): string {
  return encodeURIComponent(e164);
}

export function decodePhoneFromRoute(value?: string | string[]): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function encodePhoneForApi(e164: string): string {
  return encodeURIComponent(e164);
}
