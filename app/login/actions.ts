"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSsrClient, supabaseEnv } from "@/lib/db/ssr";

const Credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

export type SignInState = { error: string | null };

const GENERIC = "Email or password is incorrect";

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  if (!supabaseEnv()) return { error: "Sign-in isn't set up yet (Supabase is not configured)." };
  const parsed = Credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: GENERIC };

  const db = await createSsrClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) {
    await new Promise((r) => setTimeout(r, 750)); // slow down guessing; Supabase also rate-limits
    return { error: GENERIC };
  }
  redirect("/");
}

export async function signOut() {
  if (supabaseEnv()) {
    const db = await createSsrClient();
    await db.auth.signOut();
  }
  redirect("/login");
}
