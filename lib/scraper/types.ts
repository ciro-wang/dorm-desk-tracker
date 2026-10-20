import type { ScrapeResult } from "@/lib/types";

export interface ScrapeContext {
  pickupStoreIds: string[];
  merchantName: string;
}

export interface MerchantAdapter {
  merchantSlug: string;
  needsBrowser: boolean;
  scrape(url: string, ctx: ScrapeContext): Promise<ScrapeResult>;
}

export function emptyResult(status: ScrapeResult["status"], error: string | null = null): ScrapeResult {
  return {
    status,
    priceCents: null,
    wasPriceCents: null,
    shippingCents: null,
    inStockOnline: null,
    pickup: [],
    condition: "new",
    seller: "retailer",
    colour: null,
    error,
  };
}
