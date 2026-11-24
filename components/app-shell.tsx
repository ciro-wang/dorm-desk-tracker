import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { demoMode } from "@/lib/demo/mode";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/news", label: "Deals feed" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const demo = demoMode();
  const nav = demo ? NAV.filter((n) => n.href !== "/settings") : NAV;
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {demo && (
        <p role="status" className="bg-oak/15 px-4 py-2 text-center text-sm text-foreground">
          Demo with made-up products and prices. Read-only: forms and alerts are turned off.
        </p>
      )}
      <header className="border-b border-border/70 bg-ink/40">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="font-heading text-lg tracking-wide text-foreground">
            Dorm <span className="text-oak">&amp;</span> Desk
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3">
                {n.label}
              </Link>
            ))}
            {!demo && (
              <form action={signOut}>
                <button type="submit" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3">
                  Sign out
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
