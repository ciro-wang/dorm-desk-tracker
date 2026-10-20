import type { Listing, PriceLog } from "@/lib/types";

export const STALE_AFTER_MS = 6 * 3600_000;

export interface BestPrice {
  listingId: string;
  merchantId: string;
  cents: number;
  pickupNearby: boolean;
  checkedAt: string;
  source: "scraped" | "manual";
}

export function effectiveCents(log: Pick<PriceLog, "priceCents" | "shippingCents">): number | null {
  if (log.priceCents == null) return null;
  return log.priceCents + (log.shippingCents ?? 0);
}

export function isStale(checkedAt: string, now: Date, maxAgeMs = STALE_AFTER_MS): boolean {
  return now.getTime() - Date.parse(checkedAt) > maxAgeMs;
}

/** Whether a log may set a product's price: new, sold by the retailer (or a seller you trust), not a bundle, successfully checked. */
export function isCountable(listing: Listing, log: PriceLog): boolean {
  return (
    !listing.isBundle &&
    log.status === "ok" &&
    log.condition === "new" &&
    (log.seller === "retailer" || listing.trustedSeller) &&
    log.priceCents != null
  );
}

export function hasNearbyPickup(log: PriceLog, pickupStoreIds: string[]): boolean {
  return log.pickup.some((p) => p.inStock && pickupStoreIds.includes(p.externalStoreId));
}

export function bestPriceNow(
  entries: { listing: Listing; latest: PriceLog | null }[],
  now: Date,
  pickupStoreIds: string[],
): BestPrice | null {
  let best: BestPrice | null = null;
  for (const { listing, latest } of entries) {
    if (!latest || !isCountable(listing, latest) || isStale(latest.checkedAt, now)) continue;
    const cents = effectiveCents(latest)!;
    if (best && cents >= best.cents) continue;
    best = {
      listingId: listing.id,
      merchantId: listing.merchantId,
      cents,
      pickupNearby: hasNearbyPickup(latest, pickupStoreIds),
      checkedAt: latest.checkedAt,
      source: latest.source,
    };
  }
  return best;
}

/**
 * Downtown pickup for any fresh, countable listing at or under target (not only the cheapest one).
 * available: null means nothing fresh was observed, so the caller should keep what it knew before.
 */
export function pickupAtTarget(
  entries: { listing: Listing; latest: PriceLog | null }[],
  now: Date,
  pickupStoreIds: string[],
  targetHighCents: number,
): { available: true; cents: number; merchantId: string } | { available: false } | { available: null } {
  let observed = false;
  let found: { cents: number; merchantId: string } | null = null;
  for (const { listing, latest } of entries) {
    if (!latest || !isCountable(listing, latest) || isStale(latest.checkedAt, now)) continue;
    observed = true;
    const cents = effectiveCents(latest)!;
    if (cents <= targetHighCents && hasNearbyPickup(latest, pickupStoreIds) && (!found || cents < found.cents)) {
      found = { cents, merchantId: listing.merchantId };
    }
  }
  if (found) return { available: true, ...found };
  return observed ? { available: false } : { available: null };
}

/**
 * The check that should represent a listing: its newest successful check (scraped or entered by
 * the owner) while that is fresh, so a manual price survives a later blocked scrape; otherwise its newest check.
 */
export function effectiveLog(latest: PriceLog | null, latestOk: PriceLog | null, now: Date): PriceLog | null {
  if (latestOk && !isStale(latestOk.checkedAt, now)) return latestOk;
  return latest;
}
