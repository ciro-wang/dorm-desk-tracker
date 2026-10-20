import { toCents } from "@/lib/money";
import { detectBlock } from "@/lib/scraper/block";
import { fetchHtml } from "@/lib/scraper/http";
import { emptyResult, type MerchantAdapter } from "@/lib/scraper/types";
import type { Condition, PickupStock } from "@/lib/types";

/**
 * Best Buy's HTML pages block automated access, but the JSON endpoints its own pages
 * call are reachable (checked 2026-10-20):
 *   product:      /api/v2/json/product/<sku>?lang=en-CA  → salePrice, regularPrice, isMarketplace, name
 *   availability: /ecomm-api/availability/products?...&skus=<sku>&locations=<ids> → shipping + pickup
 * The pickup location shape below is unverified; no downtown store id was available to test with.
 */
const API = "https://www.bestbuy.ca";

export function bestBuySku(url: string): string | null {
  const m = new URL(url).pathname.match(/\/product\/[^/]+\/(\d{6,})\/?$/);
  return m ? m[1] : null;
}

const parseJson = (s: string) => JSON.parse(s.replace(/^﻿/, ""));

type Loc = { locationKey?: string; id?: string; name?: string; quantityOnHand?: number; hasInventory?: boolean };

export function parseBestBuyAvailability(json: unknown): { inStockOnline: boolean | null; shippingCents: number | null; pickup: PickupStock[] } {
  const a = (json as { availabilities?: Record<string, never>[] })?.availabilities?.[0] as
    | { pickup?: { locations?: Loc[] }; shipping?: { status?: string; levelsOfServices?: { price?: number }[]; isFreeShippingEligible?: boolean } }
    | undefined;
  if (!a) return { inStockOnline: null, shippingCents: null, pickup: [] };

  const ship = a.shipping;
  const prices = (ship?.levelsOfServices ?? []).map((l) => l.price).filter((p): p is number => typeof p === "number");
  const shippingCents = ship?.isFreeShippingEligible ? 0 : prices.length ? toCents(Math.min(...prices)) : null;

  const pickup = (a.pickup?.locations ?? []).map((l) => ({
    externalStoreId: String(l.locationKey ?? l.id ?? ""),
    storeName: l.name ?? "",
    inStock: Boolean(l.hasInventory ?? (l.quantityOnHand ?? 0) > 0),
  }));

  return { inStockOnline: ship?.status ? ship.status === "InStock" : null, shippingCents, pickup };
}

function conditionFromName(name: string): Condition {
  const n = name.toLowerCase();
  if (n.includes("refurbished")) return "refurbished";
  if (n.includes("open box")) return "open_box";
  return "new";
}

export const bestBuyAdapter: MerchantAdapter = {
  merchantSlug: "best-buy",
  needsBrowser: false,
  async scrape(url, ctx) {
    const sku = bestBuySku(url);
    if (!sku) return emptyResult("failed", "no_sku");

    const product = await fetchHtml(`${API}/api/v2/json/product/${sku}?lang=en-CA`);
    if (detectBlock(product.status, product.html)) return emptyResult("blocked");
    if (product.status === 404) return emptyResult("not_found");
    if (product.status >= 400) return emptyResult("failed", `http_${product.status}`);

    let p: { salePrice?: number; regularPrice?: number; isMarketplace?: boolean; name?: string };
    try {
      p = parseJson(product.html);
    } catch {
      return emptyResult("failed", "bad_json");
    }
    const price = p.salePrice ?? p.regularPrice;
    if (typeof price !== "number") return emptyResult("failed", "no_price");

    const locations = ctx.pickupStoreIds.length ? `&locations=${ctx.pickupStoreIds.map(encodeURIComponent).join("%7C")}` : "";
    const avail = await fetchHtml(
      `${API}/ecomm-api/availability/products?accept=application%2Fvnd.bestbuy.standardproduct.v1%2Bjson&accept-language=en-CA&skus=${sku}${locations}`,
    );
    let availability: ReturnType<typeof parseBestBuyAvailability> = { inStockOnline: null, shippingCents: null, pickup: [] };
    if (!detectBlock(avail.status, avail.html) && avail.status < 400) {
      try {
        availability = parseBestBuyAvailability(parseJson(avail.html));
      } catch {
        // keep price; availability unknown
      }
    }

    return {
      ...emptyResult("ok"),
      priceCents: toCents(price),
      wasPriceCents: typeof p.regularPrice === "number" && p.regularPrice > price ? toCents(p.regularPrice) : null,
      condition: conditionFromName(p.name ?? ""),
      seller: p.isMarketplace ? "marketplace" : "retailer",
      ...availability,
    };
  },
};
