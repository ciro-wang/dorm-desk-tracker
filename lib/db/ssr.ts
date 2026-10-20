import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

/** Cookie-session client using the anon key: every query runs under row-level security as the signed-in owner. */
export async function createSsrClient() {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase is not configured");
  const store = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Every page and Server Action calls this; the proxy alone is not trusted for auth. */
export async function requireUser() {
  if (!supabaseEnv()) redirect("/login");
  const db = await createSsrClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/login");
  // Signed in is not enough: only the account listed in app_owner may use the app (RLS enforces the same).
  const { data: isOwner } = await db.rpc("is_owner");
  if (isOwner !== true) redirect("/login");
  return { db, user: data.user };
}
