import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { loadCatalog } from "@/lib/data/load";
import { requireUser } from "@/lib/db/ssr";
import { removeListing, toggleAutoCheck } from "./actions";
import { AddListingForm, TargetsForm } from "./forms";

export default function SettingsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Targets, store links and alerts for each product.</p>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-xl bg-card" aria-busy="true" />}>
        <SettingsContent />
      </Suspense>
    </AppShell>
  );
}

async function SettingsContent() {
  const { db } = await requireUser();
  const { products, merchants, listings } = await loadCatalog(db);
  const merchantName = new Map(merchants.map((m) => [m.id, m.name]));

  return (
    <div className="mt-8 flex flex-col gap-6">
      {products.map((p) => (
        <section key={p.id} className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg">{p.name}</h2>
          <div className="mt-3"><TargetsForm product={p} /></div>

          <h3 className="mt-5 mb-2 text-sm text-muted-foreground">Store links</h3>
          <ul className="divide-y divide-border/60 text-sm">
            {listings.filter((l) => l.productId === p.id).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-36 shrink-0">{merchantName.get(l.merchantId)}</span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-muted-foreground hover:text-oak">{l.url}</a>
                {l.isBundle && <span className="rounded border border-border px-1.5 text-xs">Bundle</span>}
                <form action={toggleAutoCheck}>
                  <input type="hidden" name="listingId" value={l.id} />
                  {!l.autoCheck && <input type="hidden" name="autoCheck" value="on" />}
                  <button type="submit" className="text-xs text-oak hover:underline">{l.autoCheck ? "Auto-check on · turn off" : "Manual only · turn on auto-check"}</button>
                </form>
                <form action={removeListing}>
                  <input type="hidden" name="listingId" value={l.id} />
                  <button type="submit" className="text-xs text-clay hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
          <div className="mt-3"><AddListingForm productId={p.id} merchants={merchants} /></div>
        </section>
      ))}
      <p className="text-xs text-muted-foreground">To add a new product, add it in the Supabase table editor or in your private seed file for now.</p>
    </div>
  );
}
