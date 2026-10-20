import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Constant-time check of an "Authorization: Bearer <token>" header against the configured secret. */
export function verifyCronToken(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(authHeader.slice(7)), digest(secret));
}
