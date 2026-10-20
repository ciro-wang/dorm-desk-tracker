import { decideAlerts } from "@/lib/alerts/decide";
import { formatAlert } from "@/lib/alerts/format";
import type { Notifier } from "@/lib/alerts/ntfy";
import type { Repo } from "@/lib/jobs/repo";
import { isInSaleWindow } from "@/lib/jobs/schedule";
import { isMerchantUrl } from "@/lib/merchants";
import { bestPriceNow, pickupAtTarget } from "@/lib/pricing/best-price";
import { isPlausible } from "@/lib/pricing/plausible";
import type { getAdapter as GetAdapter } from "@/lib/scraper/registry";
import { emptyResult } from "@/lib/scraper/types";
import type { Product, ScrapeResult } from "@/lib/types";

export const CHECK_PRICES_JOB = "check-prices";

export interface CheckPricesDeps {
  repo: Repo;
  getAdapter: typeof GetAdapter;
  notify: Notifier;
  now: () => Date;
  appBaseUrl: string;
  /** Skip adapters that need a browser (used by the Vercel route). */
  skipBrowser?: boolean;
}

export interface CheckPricesCounts {
  checked: number;
  ok: number;
  blocked: number;
  failed: number;
  alerts: number;
}

export async function runCheckPrices(deps: CheckPricesDeps): Promise<CheckPricesCounts> {
  const { repo, getAdapter, notify, now, appBaseUrl } = deps;
  const startedAt = now();
  const counts: CheckPricesCounts = { checked: 0, ok: 0, blocked: 0, failed: 0, alerts: 0 };

  const [checkable, pickupStores, merchants, lastRun] = await Promise.all([
    repo.listCheckableListings(),
    repo.listPickupStores(),
    repo.listMerchants(),
    repo.lastJobRun(CHECK_PRICES_JOB),
  ]);

  const pickupIds = pickupStores.map((s) => s.externalStoreId);
  const storesOf = (merchantId: string) => pickupStores.filter((s) => s.merchantId === merchantId).map((s) => s.externalStoreId);

  const products = new Map<string, Product>();
  for (const { listing, product, merchant } of checkable) {
    const adapter = getAdapter(merchant.slug);
    if (deps.skipBrowser && adapter.needsBrowser) continue;
    products.set(product.id, product);

    let result: ScrapeResult;
    if (!isMerchantUrl(listing.url, merchant.slug)) {
      // Only ever fetch https pages on the store's own domain (no SSRF via a bad listing row).
      result = emptyResult("failed", "bad_url");
    } else {
      try {
        result = await adapter.scrape(listing.url, { pickupStoreIds: storesOf(merchant.id), merchantName: merchant.name });
      } catch {
        result = emptyResult("failed", "adapter_error");
      }
    }
    if (result.status === "ok" && (result.priceCents == null || !isPlausible(result.priceCents, product.msrpCents))) {
      result = { ...result, status: "failed", error: "implausible" };
    }

    await repo.insertPriceLog({ ...result, listingId: listing.id, checkedAt: now().toISOString(), source: "scraped" });
    counts.checked += 1;
    if (result.status === "ok") counts.ok += 1;
    else if (result.status === "blocked") counts.blocked += 1;
    else counts.failed += 1;
  }

  const merchantName = new Map(merchants.map((m) => [m.id, m.name]));
  for (const product of products.values()) {
    if (!product.alertsEnabled) continue;
    const entries = await repo.latestLogsForProduct(product.id);
    const best = bestPriceNow(entries, now(), pickupIds);
    const pickup = pickupAtTarget(entries, now(), pickupIds, product.targetHighCents);
    const prev = await repo.getAlertState(product.id);
    const { events, next } = decideAlerts(
      prev,
      {
        bestCents: best?.cents ?? null,
        merchantName: best ? (merchantName.get(best.merchantId) ?? "a store") : "",
        pickupNearby: pickup.available,
        ...(pickup.available && { pickupCents: pickup.cents, pickupMerchantName: merchantName.get(pickup.merchantId) ?? "a store" }),
      },
      product,
      now(),
    );
    try {
      for (const e of events) {
        await notify.send(formatAlert(e, product, appBaseUrl));
        await repo.logAlert(product.id, e.kind, e.cents);
        counts.alerts += 1;
      }
      await repo.saveAlertState(next);
    } catch {
      // Delivery failed: leave state unchanged so the alert is retried on the next run.
    }
  }

  const current = now();
  if (isInSaleWindow(current) && (!lastRun || !isInSaleWindow(lastRun))) {
    try {
      await notify.send({
        title: "Sale window open",
        message:
          "Prices are being checked every 30 min. Please verify listings that can't be auto-checked (e.g. Amazon.ca, Newegg, Memory Express).",
        clickUrl: `${appBaseUrl.replace(/\/$/, "")}/`,
        priority: 3,
      });
    } catch {
      // Not critical; the dashboard shows which listings need manual checks.
    }
  }

  await repo.recordJobRun(CHECK_PRICES_JOB, startedAt, counts.ok, counts.failed + counts.blocked);
  return counts;
}
