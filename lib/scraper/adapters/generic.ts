import { detectBlock } from "@/lib/scraper/block";
import { fetchHtml } from "@/lib/scraper/http";
import { extractJsonLdOffer } from "@/lib/scraper/jsonld";
import { emptyResult, type MerchantAdapter, type ScrapeContext } from "@/lib/scraper/types";
import type { ScrapeResult } from "@/lib/types";

/** Shared by store adapters: turns a fetched page into a result using schema.org JSON-LD. */
export function resultFromHtml(status: number, html: string, ctx: ScrapeContext): ScrapeResult {
  if (detectBlock(status, html)) return emptyResult("blocked");
  if (status === 404 || status === 410) return emptyResult("not_found");
  if (status >= 400) return emptyResult("failed", `http_${status}`);

  const offer = extractJsonLdOffer(html);
  if (!offer || offer.priceCents == null) return emptyResult("failed", "no_price");
  if (offer.currency !== "CAD") return emptyResult("failed", "non_cad");

  const seller = offer.sellerName?.toLowerCase();
  const merchant = ctx.merchantName.toLowerCase().replace(/\.ca$/, "");
  const isRetailer = !offer.multiOffer && (!seller || seller.includes(merchant) || merchant.includes(seller));

  return {
    ...emptyResult("ok"),
    priceCents: offer.priceCents,
    inStockOnline: offer.availability == null ? null : offer.availability === "in_stock",
    condition: offer.condition,
    seller: isRetailer ? "retailer" : "marketplace",
  };
}

export const genericAdapter: MerchantAdapter = {
  merchantSlug: "*",
  needsBrowser: false,
  async scrape(url, ctx) {
    const { status, html } = await fetchHtml(url);
    return resultFromHtml(status, html, ctx);
  },
};
