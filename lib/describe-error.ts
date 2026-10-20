/**
 * A short, human-readable reason for any thrown value. Supabase returns plain objects
 * ({ message, code, details, hint }) rather than Error instances. Never includes keys or env values.
 */
export function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && typeof (e as { message?: unknown }).message === "string") {
    const { message, code, hint } = e as { message: string; code?: unknown; hint?: unknown };
    let out = message;
    if (typeof code === "string" && code) out += ` (code ${code})`;
    if (typeof hint === "string" && hint) out += ` — ${hint}`;
    return out;
  }
  return "unknown error";
}
