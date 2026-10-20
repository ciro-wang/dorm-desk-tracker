"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { error: null });
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        Email
        <input name="email" type="email" autoComplete="username" required className="rounded-md border border-border bg-ink px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="rounded-md border border-border bg-ink px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring" />
      </label>
      {state.error && <p role="alert" className="text-sm text-clay">{state.error}</p>}
      <button type="submit" disabled={pending} className="mt-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
