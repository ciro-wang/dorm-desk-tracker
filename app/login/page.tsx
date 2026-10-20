import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-[0_1px_0_0_rgba(236,228,216,0.04)_inset]">
        <h1 className="text-2xl">Dorm &amp; Desk Tracker</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">Private. Sign in to continue.</p>
        <LoginForm />
      </div>
    </main>
  );
}
