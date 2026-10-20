import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Badges } from "@/components/badges";
import { ListingTable, type ListingRowData } from "@/components/listing-table";
import { Price } from "@/components/price";
import { PriceHistoryChart } from "@/components/price-history-chart";
import { VerdictPill } from "@/components/verdict-pill";
import { SHELF_LIMIT_CM, SINGLE_CABLE_MIN_W } from "@/lib/badges";
import { buildChartSeries } from "@/lib/chart";
import { buildWatchRow } from "@/lib/dashboard";
import { loadCatalog, loadLatestLogs, loadListingHistory, loadProductHistory } from "@/lib/data/load";
import { requireUser } from "@/lib/db/ssr";
import { formatCad } from "@/lib/money";
import type { PriceLog, Product } from "@/lib/types";

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <AppShell>
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-xl bg-card" aria-busy="true" />}>
        <ProductDetail params={params} />
      </Suspense>
    </AppShell>
  );
}

const isOtherOffer = (l: PriceLog | null) => l != null && (l.condition !== "new" || l.seller === "marketplace");

async function ProductDetail({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const { db } = await requireUser();
  const { slug } = await params;
  const now = new Date();
  const catalog = await loadCatalog(db);
  const product = catalog.products.find((p) => p.slug === slug);
  if (!product) notFound();

  const listings = catalog.listings.filter((l) => l.productId === product.id);
  const [latest, history, listingHistory] = await Promise.all([
    loadLatestLogs(db, listings.map((l) => l.id)),
    loadProductHistory(db, [product.id], 365),
    loadListingHistory(db, product.id, 120),
  ]);
  const pickupIds = catalog.pickupStores.map((s) => s.externalStoreId);
  const merchant = new Map(catalog.merchants.map((m) => [m.id, m]));
  const entries = listings.map((listing) => ({ listing, latest: latest.get(listing.id) ?? null }));
  const row = buildWatchRow(product, entries, history.get(product.id) ?? [], pickupIds, now);

  const toRow = (e: (typeof entries)[number]): ListingRowData => ({
    ...e,
    merchant: merchant.get(e.listing.merchantId),
    pickupIds: catalog.pickupStores.filter((s) => s.merchantId === e.listing.merchantId).map((s) => s.externalStoreId),
  });
  const main = entries.filter((e) => !e.listing.isBundle && !isOtherOffer(e.latest)).map(toRow);
  const others = entries.filter((e) => !e.listing.isBundle && isOtherOffer(e.latest)).map(toRow);
  const bundles = entries.filter((e) => e.listing.isBundle);

  const chartStores = [...new Set(listingHistory.map((h) => h.merchantId))].map((id) => ({ slug: merchant.get(id)?.slug ?? id, name: merchant.get(id)?.name ?? "Store" }));
  const chartData = buildChartSeries(listingHistory.map((h) => ({ day: h.day, merchantSlug: merchant.get(h.merchantId)?.slug ?? h.merchantId, cents: h.cents })));

  return (
    <div className="mt-6 flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl">{product.name}</h1>
          <VerdictPill level={row.verdict.level} />
        </div>
        {row.verdict.reasons.length > 0 && (
          <ul className="text-sm text-muted-foreground">
            {row.verdict.reasons.map((r) => <li key={r}>· {r}</li>)}
          </ul>
        )}
        <Badges kinds={row.badges} />
      </header>

      <section aria-label="Price summary" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Best now" value={row.best ? <Price cents={row.best.cents} /> : "—"} note={row.best ? (merchant.get(row.best.merchantId)?.name ?? "") : row.emptyMessage ?? ""} />
        <Stat label="Lowest seen" value={row.stats.allTimeLowCents != null ? <Price cents={row.stats.allTimeLowCents} /> : "—"} />
        <Stat label="Usual (30 days)" value={row.stats.typical30dCents != null ? <Price cents={row.stats.typical30dCents} /> : "—"} />
        <Stat label="Your target" value={targetText(product)} />
        <Stat label="MSRP" value={<Price cents={product.msrpCents} />} />
      </section>

      <section aria-labelledby="stores">
        <h2 id="stores" className="mb-3 text-xl">Stores</h2>
        {main.length ? <ListingTable rows={main} now={now} bestListingId={row.best?.listingId ?? null} /> : <p className="text-sm text-muted-foreground">No store listings yet. Add one in Settings.</p>}
        <p className="mt-2 text-xs text-muted-foreground">Automatic prices can be wrong or out of date. Check the store’s page before you buy.</p>
      </section>

      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-xl">Price history</h2>
        <div className="rounded-xl border border-border bg-card p-4">
          <PriceHistoryChart data={chartData} stores={chartStores} targetDollars={product.targetHighCents / 100} msrpDollars={product.msrpCents / 100} />
        </div>
      </section>

      {bundles.length > 0 && (
        <section aria-labelledby="bundles">
          <h2 id="bundles" className="mb-1 text-xl">Bundles</h2>
          <p className="mb-3 text-sm text-muted-foreground">Kept separate from the price history so they don’t distort it.</p>
          <ul className="divide-y divide-border/70 rounded-xl border border-border bg-card">
            {bundles.map(({ listing, latest: l }) => (
              <li key={listing.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  <a href={listing.url} target="_blank" rel="noopener noreferrer" className="hover:text-oak hover:underline">{merchant.get(listing.merchantId)?.name}</a>
                  {listing.bundleContents && <span className="text-muted-foreground"> · {listing.bundleContents}</span>}
                </span>
                <span className="tabular-nums">{l?.status === "ok" && l.priceCents != null ? formatCad(l.priceCents) : "—"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="other">
          <h2 id="other" className="mb-1 text-xl">Other offers</h2>
          <p className="mb-3 text-sm text-muted-foreground">Open-box, refurbished or third-party sellers. Shown for reference; never counted as the best price.</p>
          <ListingTable rows={others} now={now} bestListingId={null} />
        </section>
      )}

      <section aria-labelledby="specs">
        <h2 id="specs" className="mb-3 text-xl">Specs</h2>
        <Specs product={product} />
      </section>
    </div>
  );
}

function targetText(p: Product) {
  return p.targetLowCents < p.targetHighCents ? `${formatCad(p.targetLowCents)}–${formatCad(p.targetHighCents)}` : `≤ ${formatCad(p.targetHighCents)}`;
}

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-xl tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
    </div>
  );
}

function Specs({ product }: { product: Product }) {
  const s = product.specs;
  const rows: [string, string][] =
    s.kind === "monitor"
      ? [
          ["Size", `${s.sizeIn}″`],
          ["Resolution", `${s.resW} × ${s.resH} (${Math.round(Math.hypot(s.resW, s.resH) / s.sizeIn)} PPI)`],
          ["Refresh rate", `${s.refreshHz} Hz`],
          ["Panel", s.panel + (s.curve ? ` · ${s.curve} curve` : "")],
          ["Panel height (no stand)", `${s.panelHeightCm} cm · shelf limit ${SHELF_LIMIT_CM} cm`],
          ["USB-C power for MacBook", s.usbcPdW == null ? "Unknown" : `${s.usbcPdW} W ${s.usbcPdW >= SINGLE_CABLE_MIN_W ? "· one cable charges a MacBook Pro" : "· not enough to charge a MacBook Pro"}`],
        ]
      : [
          ["Woofer", `${s.wooferIn}″`],
          ["Subwoofer output", s.subOut == null ? "Not confirmed yet" : s.subOut ? "Yes" : "No"],
          ["Inputs", s.inputs.length ? s.inputs.join(", ") : "Not recorded yet"],
          ["Dimensions", s.dimensionsMm ? `${s.dimensionsMm.w} × ${s.dimensionsMm.h} × ${s.dimensionsMm.d} mm` : "Not recorded yet"],
        ];
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 rounded-xl border border-border bg-card px-4 py-4 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-border/50 py-1.5 last:border-0">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
