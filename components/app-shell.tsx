import Link from "next/link";
import { signOut } from "@/app/login/actions";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/news", label: "Deals feed" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border/70 bg-ink/40">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="font-heading text-lg tracking-wide text-foreground">
            Dorm <span className="text-oak">&amp;</span> Desk
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3">
                {n.label}
              </Link>
            ))}
            <form action={signOut}>
              <button type="submit" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
