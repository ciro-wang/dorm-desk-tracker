const PUBLIC_EXACT = new Set(["/login", "/api/cron/check-prices", "/api/cron/fetch-news", "/favicon.ico", "/robots.txt"]);

/** Paths reachable without a session. Cron routes still require their bearer token. */
export function isPublicPath(pathname: string): boolean {
  if (pathname.split("/").some((seg) => seg === ".." || seg === ".")) return false;
  return PUBLIC_EXACT.has(pathname) || pathname.startsWith("/_next/");
}
