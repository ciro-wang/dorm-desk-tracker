import type { AlertKind, AlertState } from "@/lib/alerts/decide";
import type { Repo } from "@/lib/jobs/repo";
import { effectiveLog } from "@/lib/pricing/best-price";
import type { Listing, Merchant, NewsItem, PickupStore, PriceLog, Product } from "@/lib/types";

export class FakeRepo implements Repo {
  logs: Omit<PriceLog, "id">[] = [];
  alertStates = new Map<string, AlertState>();
  alertLog: { productId: string; kind: AlertKind; cents: number }[] = [];
  jobRuns: { job: string; startedAt: Date; ok: number; failed: number }[] = [];
  news: Omit<NewsItem, "id">[] = [];

  constructor(
    public products: Product[],
    public merchants: Merchant[],
    public listings: Listing[],
    public pickupStores: PickupStore[] = [],
  ) {}

  async listCheckableListings() {
    return this.listings
      .filter((l) => l.autoCheck)
      .map((listing) => ({
        listing,
        product: this.products.find((p) => p.id === listing.productId)!,
        merchant: this.merchants.find((m) => m.id === listing.merchantId)!,
      }))
      .filter((x) => x.product.active);
  }
  async listMerchants() {
    return this.merchants;
  }
  async listPickupStores() {
    return this.pickupStores;
  }
  async insertPriceLog(log: Omit<PriceLog, "id">) {
    this.logs.push(log);
  }
  async latestLogsForProduct(productId: string) {
    return this.listings
      .filter((l) => l.productId === productId)
      .map((listing) => {
        const mine = this.logs
          .filter((g) => g.listingId === listing.id)
          .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
          .map((g) => ({ id: "x", ...g }) as PriceLog);
        const now = new Date(Math.max(...mine.map((g) => Date.parse(g.checkedAt)), 0));
        return { listing, latest: effectiveLog(mine[0] ?? null, mine.find((g) => g.status === "ok") ?? null, now) };
      });
  }
  async historyPoints() {
    return [];
  }
  async getAlertState(productId: string) {
    return this.alertStates.get(productId) ?? null;
  }
  async saveAlertState(s: AlertState) {
    this.alertStates.set(s.productId, s);
  }
  async logAlert(productId: string, kind: AlertKind, cents: number) {
    this.alertLog.push({ productId, kind, cents });
  }
  async lastJobRun(job: string) {
    const runs = this.jobRuns.filter((r) => r.job === job);
    return runs.length ? runs[runs.length - 1].startedAt : null;
  }
  async recordJobRun(job: string, startedAt: Date, ok: number, failed: number) {
    this.jobRuns.push({ job, startedAt, ok, failed });
  }
  async upsertNewsItems(items: Omit<NewsItem, "id">[]) {
    const fresh = items.filter((i) => !this.news.some((n) => n.source === i.source && n.sourceId === i.sourceId));
    this.news.push(...fresh);
    return fresh.length;
  }
  async listActiveProducts() {
    return this.products.filter((p) => p.active);
  }
}
