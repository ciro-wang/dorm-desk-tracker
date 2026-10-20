import type { AlertKind, AlertState } from "@/lib/alerts/decide";
import type { Listing, Merchant, NewsItem, PickupStore, PriceLog, Product } from "@/lib/types";

/** Everything the scheduled jobs need from storage. Implemented by lib/db/supabase-repo.ts. */
export interface Repo {
  listCheckableListings(): Promise<{ listing: Listing; product: Product; merchant: Merchant }[]>;
  listMerchants(): Promise<Merchant[]>;
  listPickupStores(): Promise<PickupStore[]>;
  insertPriceLog(log: Omit<PriceLog, "id">): Promise<void>;
  latestLogsForProduct(productId: string): Promise<{ listing: Listing; latest: PriceLog | null }[]>;
  historyPoints(productId: string): Promise<{ at: Date; cents: number }[]>;
  getAlertState(productId: string): Promise<AlertState | null>;
  saveAlertState(s: AlertState): Promise<void>;
  logAlert(productId: string, kind: AlertKind, cents: number): Promise<void>;
  lastJobRun(job: string): Promise<Date | null>;
  recordJobRun(job: string, startedAt: Date, ok: number, failed: number): Promise<void>;
  upsertNewsItems(items: Omit<NewsItem, "id">[]): Promise<number>;
  listActiveProducts(): Promise<Product[]>;
}
