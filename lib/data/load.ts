import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dailyRowsToPoints, listingFromRow, merchantFromRow, newsItemFromRow, priceLogFromRow, productFromRow } from "@/lib/db/mappers";
import { effectiveLog } from "@/lib/pricing/best-price";
import type { Listing, Merchant, NewsItem, PickupStore, PriceLog, Product } from "@/lib/types";

/* Reads for pages. All run through the owner's cookie session, so row-level security applies. */

type Row = Record<string, unknown>;
const PAGE = 1000;

async function all(query: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(`db error: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

export interface Catalog {
  products: Product[];
  merchants: Merchant[];
  listings: Listing[];
  pickupStores: PickupStore[];
}

export async function loadCatalog(db: SupabaseClient): Promise<Catalog> {
  const [products, merchants, listings, stores] = await Promise.all([
    all((a, b) => db.from("products").select("*").order("name").range(a, b)),
    all((a, b) => db.from("merchants").select("*").order("name").range(a, b)),
    all((a, b) => db.from("listings").select("*").range(a, b)),
    all((a, b) => db.from("pickup_stores").select("*").range(a, b)),
  ]);
  return {
    products: products.map(productFromRow),
    merchants: merchants.map(merchantFromRow),
    listings: listings.map(listingFromRow),
    pickupStores: stores.map((r) => ({
      id: r.id as string,
      merchantId: r.merchant_id as string,
      externalStoreId: r.external_store_id as string,
      name: r.name as string,
    })),
  };
}

/** The log that represents each listing right now (see effectiveLog). */
export async function loadLatestLogs(db: SupabaseClient, listingIds: string[]): Promise<Map<string, PriceLog>> {
  if (!listingIds.length) return new Map();
  const [latest, latestOk] = await Promise.all([
    all((a, b) => db.from("latest_price_logs").select("*").in("listing_id", listingIds).order("listing_id").range(a, b)),
    all((a, b) => db.from("latest_ok_price_logs").select("*").in("listing_id", listingIds).order("listing_id").range(a, b)),
  ]);
  const ok = new Map(latestOk.map((r) => [r.listing_id as string, priceLogFromRow(r)]));
  const now = new Date();
  const out = new Map<string, PriceLog>();
  for (const r of latest) {
    const id = r.listing_id as string;
    const chosen = effectiveLog(priceLogFromRow(r), ok.get(id) ?? null, now);
    if (chosen) out.set(id, chosen);
  }
  return out;
}

/** Daily best price per product (Toronto days). */
export async function loadProductHistory(db: SupabaseClient, productIds: string[], days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = productIds.length
    ? await all((a, b) =>
        db.from("product_daily_best").select("product_id, day, cents").in("product_id", productIds).gte("day", since).order("day").range(a, b),
      )
    : [];
  const byProduct = new Map<string, { at: Date; cents: number }[]>();
  for (const id of productIds) byProduct.set(id, []);
  for (const r of rows) byProduct.get(r.product_id as string)?.push(...dailyRowsToPoints([{ day: r.day as string, cents: r.cents as number }]));
  return byProduct;
}

/** Daily best per listing for one product (chart lines per store). */
export async function loadListingHistory(db: SupabaseClient, productId: string, days: number) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await all((a, b) =>
    db.from("listing_daily_best").select("listing_id, merchant_id, day, cents").eq("product_id", productId).gte("day", since).order("day").range(a, b),
  );
  return rows.map((r) => ({ listingId: r.listing_id as string, merchantId: r.merchant_id as string, day: r.day as string, cents: r.cents as number }));
}

/** Every check for one product's listings in the last few days (the product page's "other offers" and status). */
export async function loadRecentLogs(db: SupabaseClient, listingIds: string[], days: number): Promise<PriceLog[]> {
  if (!listingIds.length) return [];
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await all((a, b) =>
    db.from("price_logs").select("*").in("listing_id", listingIds).gte("checked_at", since).order("checked_at", { ascending: false }).range(a, b),
  );
  return rows.map(priceLogFromRow);
}

export async function loadNews(
  db: SupabaseClient,
  opts: { sinceHours?: number; limit: number; offset?: number; source?: NewsItem["source"]; tag?: string; matchedOnly?: boolean; sort?: "score" | "recent" },
): Promise<NewsItem[]> {
  let q = db.from("news_items").select("*");
  if (opts.sinceHours) q = q.gte("published_at", new Date(Date.now() - opts.sinceHours * 3600_000).toISOString());
  if (opts.source) q = q.eq("source", opts.source);
  if (opts.tag) q = q.contains("tags", [opts.tag]);
  if (opts.matchedOnly) q = q.neq("matched_product_ids", "{}");
  const from = opts.offset ?? 0;
  if (opts.sort !== "recent") q = q.order("score", { ascending: false });
  const { data, error } = await q.order("published_at", { ascending: false }).range(from, from + opts.limit - 1);
  if (error) throw new Error(`db error: ${error.message}`);
  return (data ?? []).map(newsItemFromRow);
}
