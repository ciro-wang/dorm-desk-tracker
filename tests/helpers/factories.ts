import type { Listing, PriceLog, Product } from "@/lib/types";

export function monitor(over: Partial<Product> = {}): Product {
  return {
    id: "p-mon",
    slug: "example-monitor",
    name: "Example OLED Monitor M27X",
    category: "monitor",
    msrpCents: 150000,
    targetHighCents: 110000,
    targetLowCents: 110000,
    colourPrefs: [],
    specs: { kind: "monitor", sizeIn: 27, resW: 3840, resH: 2160, refreshHz: 240, panel: "OLED", panelHeightCm: 40, usbcPdW: 90, curve: null },
    active: true,
    alertsEnabled: true,
    referenceLowCents: null,
    ...over,
  };
}

export function speaker(over: Partial<Product> = {}): Product {
  return {
    id: "p-spk",
    slug: "example-speakers",
    name: "Example Speakers S50",
    category: "speaker",
    msrpCents: 30000,
    targetHighCents: 24000,
    targetLowCents: 21000,
    colourPrefs: ["Black"],
    specs: { kind: "speaker", wooferIn: 5, subOut: null, dimensionsMm: null, inputs: [] },
    active: true,
    alertsEnabled: true,
    referenceLowCents: null,
    ...over,
  };
}

let n = 0;
export function listing(over: Partial<Listing> = {}): Listing {
  n += 1;
  return { id: `l-${n}`, productId: "p-mon", merchantId: `m-${n}`, url: `https://example.ca/${n}`, isBundle: false, bundleContents: null, autoCheck: true, trustedSeller: false, ...over };
}

export function log(listingId: string, over: Partial<PriceLog> = {}): PriceLog {
  return {
    id: `log-${listingId}-${over.checkedAt ?? "x"}`,
    listingId,
    checkedAt: "2026-11-27T11:30:00Z",
    source: "scraped",
    status: "ok",
    priceCents: 120000,
    wasPriceCents: null,
    shippingCents: null,
    inStockOnline: true,
    pickup: [],
    condition: "new",
    seller: "retailer",
    colour: null,
    error: null,
    ...over,
  };
}
