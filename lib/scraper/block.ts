const BLOCK_STATUSES = new Set([403, 429, 503]);

/**
 * Markers of bot walls and captcha challenge pages. Deliberately not a bare "captcha":
 * ordinary product pages embed reCAPTCHA widgets in their forms.
 */
const BLOCK_MARKERS = [
  "robot check",
  "px-captcha",
  "captcha-delivery.com",
  "/cdn-cgi/challenge-platform",
  "access denied",
  "are you a human",
  "verify you are human",
  "enter the characters you see below",
];

export function detectBlock(status: number, html: string): boolean {
  if (BLOCK_STATUSES.has(status)) return true;
  const lower = html.toLowerCase();
  return BLOCK_MARKERS.some((m) => lower.includes(m));
}
