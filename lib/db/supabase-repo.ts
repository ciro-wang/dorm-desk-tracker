import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertKind, AlertState } from "@/lib/alerts/decide";
import {
  alertStateFromRow,
  alertStateToRow,
  dailyRowsToPoints,
  listingFromRow,
  merchantFromRow,
  newsItemToRow,
  priceLogFromRow,
  priceLogToRow,
  productFromRow,
} from "@/lib/db/mappers";
import type { Repo } from "@/lib/jobs/repo";
import { effectiveLog } from "@/lib/pricing/best-price";
import type { NewsItem } from "@/lib/types";

const HISTORY_DAYS = 365;

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`db error: ${res.error.message}`);
  return res.data as T;
}

export function supabaseRepo(db: SupabaseClient): Repo {
  return {
    async listCheckableListings() {
      const rows = must(
        await db.from("listings").select("*, products!inner(*), merchants!inner(*)").eq("auto_check", true).eq("products.active", true),
      ) as Record<string, unknown>[];
      return rows.map((r) => ({
        listing: listingFromRow(r),
        product: productFromRow(r.products as Record<string, unknown>),
        merchant: merchantFromRow(r.merchants as Record<string, unknown>),
      }));
    },

    async listMerchants() {
      return (must(await db.from("merchants").select("*")) as Record<string, unknown>[]).map(merchantFromRow);
    },

    async listPickupStores() {
      return (must(await db.from("pickup_stores").select("*")) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        merchantId: r.merchant_id as string,
        externalStoreId: r.external_store_id as string,
        name: r.name as string,
      }));
    },

    async insertPriceLog(log) {
      must(await db.from("price_logs").insert(priceLogToRow(log)));
    },

    async latestLogsForProduct(productId) {
      const listings = (must(await db.from("listings").select("*").eq("product_id", productId)) as Record<string, unknown>[]).map(
        listingFromRow,
      );
      if (!listings.length) return [];
      const ids = listings.map((l) => l.id);
      const [latest, latestOk] = await Promise.all([
        db.from("latest_price_logs").select("*").in("listing_id", ids),
        db.from("latest_ok_price_logs").select("*").in("listing_id", ids),
      ]);
      const newest = (must(latest) as Record<string, unknown>[]).map(priceLogFromRow);
      const newestOk = (must(latestOk) as Record<string, unknown>[]).map(priceLogFromRow);
      const now = new Date();
      return listings.map((listing) => ({
        listing,
        latest: effectiveLog(
          newest.find((l) => l.listingId === listing.id) ?? null,
          newestOk.find((l) => l.listingId === listing.id) ?? null,
          now,
        ),
      }));
    },

    async historyPoints(productId) {
      const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
      const rows = must(
        await db.from("product_daily_best").select("day, cents").eq("product_id", productId).gte("day", since).order("day"),
      ) as { day: string; cents: number }[];
      return dailyRowsToPoints(rows);
    },

    async getAlertState(productId) {
      const rows = must(await db.from("alert_state").select("*").eq("product_id", productId)) as Record<string, unknown>[];
      return rows[0] ? alertStateFromRow(rows[0]) : null;
    },

    async saveAlertState(s: AlertState) {
      must(await db.from("alert_state").upsert({ ...alertStateToRow(s), updated_at: new Date().toISOString() }, { onConflict: "product_id" }));
    },

    async logAlert(productId: string, kind: AlertKind, cents: number) {
      must(await db.from("alert_log").insert({ product_id: productId, kind, price_cents: cents }));
    },

    async lastJobRun(job) {
      const rows = must(
        await db.from("job_runs").select("started_at").eq("job", job).order("started_at", { ascending: false }).limit(1),
      ) as { started_at: string }[];
      return rows[0] ? new Date(rows[0].started_at) : null;
    },

    async recordJobRun(job, startedAt, ok, failed) {
      must(await db.from("job_runs").insert({ job, started_at: startedAt.toISOString(), ok_count: ok, failed_count: failed }));
    },

    async upsertNewsItems(items: Omit<NewsItem, "id">[]) {
      if (!items.length) return 0;
      const rows = must(
        await db.from("news_items").upsert(items.map(newsItemToRow), { onConflict: "source,source_id", ignoreDuplicates: true }).select("id"),
      ) as unknown[];
      return rows.length;
    },

    async listActiveProducts() {
      return (must(await db.from("products").select("*").eq("active", true)) as Record<string, unknown>[]).map(productFromRow);
    },
  };
}

