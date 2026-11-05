import type { Notification } from "@/lib/alerts/format";
import { formatCad } from "@/lib/money";
import { effectiveCents, isComparable, isStale } from "@/lib/pricing/best-price";
import { torontoDate } from "@/lib/time";
import type { Currency, Listing, PriceLog, Product, Purchase } from "@/lib/types";

export interface PurchaseOffer {
  /** In CAD (US prices already converted). */
  cents: number;
  merchantName: string;
  sameStore: boolean;
  native: { cents: number; currency: Currency } | null;
}

/** The lowest current new price for something already bought, across every store including US ones. */
export function lowestOffer(
  entries: { listing: Listing; latest: PriceLog | null }[],
  purchase: Purchase,
  merchantName: Map<string, string>,
  now: Date,
): PurchaseOffer | null {
  let best: PurchaseOffer | null = null;
  for (const { listing, latest } of entries) {
    if (!latest || !isComparable(listing, latest) || isStale(latest.checkedAt, now)) continue;
    const cents = effectiveCents(latest)!;
    if (best && cents >= best.cents) continue;
    best = {
      cents,
      merchantName: merchantName.get(listing.merchantId) ?? "a store",
      sameStore: listing.merchantId === purchase.merchantId,
      native: latest.nativePriceCents != null && latest.nativeCurrency ? { cents: latest.nativePriceCents, currency: latest.nativeCurrency } : null,
    };
  }
  return best;
}

/** Alert when a price is below what was paid, before the claim deadline, and lower than the last alert. */
export function decidePurchaseAlert(purchase: Purchase, offer: PurchaseOffer | null, now: Date): boolean {
  if (!offer || torontoDate(now) > purchase.claimBy) return false;
  if (offer.cents >= purchase.paidCents) return false;
  return purchase.lastAlertedCents == null || offer.cents < purchase.lastAlertedCents;
}

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });

export function formatPurchaseAlert(purchase: Purchase, product: Product, offer: PurchaseOffer, appBaseUrl: string): Notification {
  const price = offer.native ? `US$${(offer.native.cents / 100).toFixed(2)} (≈ ${formatCad(offer.cents)})` : formatCad(offer.cents);
  const paid = formatCad(purchase.paidCents);
  const by = shortDate(purchase.claimBy);
  const tail = offer.sameStore
    ? `(you paid ${paid} there) · ask for the difference or return and rebuy by ${by}`
    : `· you paid ${paid} at another store · claim or return by ${by}`;
  return {
    title: `${product.name} · ${formatCad(purchase.paidCents - offer.cents)} under what you paid`,
    message: `${price} at ${offer.merchantName} ${tail}`,
    clickUrl: `${appBaseUrl.replace(/\/$/, "")}/product/${product.slug}`,
    priority: 4,
  };
}
