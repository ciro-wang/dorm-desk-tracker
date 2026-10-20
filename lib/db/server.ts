import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for scheduled jobs, scripts and trusted server code.
 * It bypasses row-level security, so it must never be imported by client components.
 */
export function createServiceClient(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("createServiceClient must not run in the browser");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
