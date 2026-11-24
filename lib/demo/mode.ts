/*
 * Public demo mode: DEMO_MODE=1 serves made-up data from lib/demo with no login and no writes.
 * It is meant for a separate deploy with no secrets, so it refuses to start next to any of them.
 */

const FORBIDDEN_IN_DEMO = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NTFY_TOPIC_URL",
  "CRON_TOKEN",
] as const;

type Env = Record<string, string | undefined>;

export function demoMode(env: Env = process.env): boolean {
  if (env.DEMO_MODE !== "1") return false;
  const present = FORBIDDEN_IN_DEMO.filter((k) => env[k]);
  if (present.length) {
    throw new Error(`DEMO_MODE=1 must run without real credentials; remove: ${present.join(", ")}`);
  }
  return true;
}

export type DemoRoute = { action: "allow" } | { action: "not_found" } | { action: "method_not_allowed" } | { action: "redirect"; to: "/" };

/** What the proxy does with a request in demo mode. */
export function demoRoute(method: string, pathname: string): DemoRoute {
  if (pathname === "/api" || pathname.startsWith("/api/")) return { action: "not_found" };
  // Server Actions are POSTs to page paths, so this also blocks every write.
  if (method !== "GET" && method !== "HEAD") return { action: "method_not_allowed" };
  if (pathname === "/login" || pathname === "/settings" || pathname.startsWith("/settings/")) return { action: "redirect", to: "/" };
  return { action: "allow" };
}
