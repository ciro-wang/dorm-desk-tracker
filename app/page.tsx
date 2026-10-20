import Link from "next/link";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { FeedList } from "@/components/feed-list";
import { WatchCard } from "@/components/watch-card";
import { buildWatchRow } from "@/lib/dashboard";
import { loadCatalog, loadLatestLogs, loadNews, loadProductHistory } from "@/lib/data/load";
import { requireUser } from "@/lib/db/ssr";
import type { Category } from "@/lib/types";

export default function DashboardPage({ searchParams }: PageProps<"/">) {
  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </AppShell>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { db } = await requireUser();
  const cat: Category = (await searchParams).cat === "speaker" ? "speaker" : "monitor";
  const now = new Date();

  const catalog = await loadCatalog(db);
  const products = catalog.products.filter((p) => p.active && p.category === cat);
  const listings = catalog.listings.filter((l) => products.some((p) => p.id === l.productId));
  const [latest, history, news] = await Promise.all([
    loadLatestLogs(db, listings.map((l) => l.id)),
    loadProductHistory(db, products.map((p) => p.id), 60),
    loadNews(db, { sinceHours: 48, limit: 15 }),
  ]);
  const pickupIds = catalog.pickupStores.map((s) => s.externalStoreId);
  const merchantName = new Map(catalog.merchants.map((m) => [m.id, m.name]));
  const rows = products.map((p) =>
    buildWatchRow(
      p,
      listings.filter((l) => l.productId === p.id).map((listing) => ({ listing, latest: latest.get(listing.id) ?? null })),
      history.get(p.id) ?? [],
      pickupIds,
      now,
    ),
  );

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="feed">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="feed" className="text-xl">Latest deals</h2>
          <Link href="/news" className="text-sm text-oak hover:underline">All deal posts →</Link>
        </div>
        <FeedList items={news} products={catalog.products} now={now} />
      </section>

      <section aria-labelledby="watch">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="watch" className="text-xl">Your watchlist</h2>
          <div role="tablist" aria-label="Category" className="inline-flex rounded-lg border border-border bg-card p-1 text-sm">
            {(["monitor", "speaker"] as const).map((c) => (
              <Link
                key={c}
                role="tab"
                aria-selected={c === cat}
                href={c === "monitor" ? "/" : "/?cat=speaker"}
                className={`rounded-md px-3 py-1 ${c === cat ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {c === "monitor" ? "Monitors" : "Speakers"}
              </Link>
            ))}
          </div>
        </div>
        {rows.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map((r) => (
              <WatchCard key={r.product.id} row={r} merchantName={r.best ? (merchantName.get(r.best.merchantId) ?? null) : null} now={now} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing on your watchlist in this category yet.</p>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          Prices are checked automatically where stores allow it. Always confirm on the store’s page before buying.
        </p>
      </section>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
      <div className="h-48 animate-pulse rounded-xl bg-card" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-44 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    </div>
  );
}
