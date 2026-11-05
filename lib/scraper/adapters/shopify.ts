import { fetchHtml } from "@/lib/scraper/http";
import { emptyResult, type MerchantAdapter } from "@/lib/scraper/types";
import type { ScrapeResult } from "@/lib/types";

interface ShopifyVariant {
  id: number;
  title?: string;
  price: number;
  compare_at_price?: number | null;
  available?: boolean;
}

/** A Shopify product page → its public /products/<handle>.js data, plus the ?variant= picked in the URL. */
export function productJsonUrl(pageUrl: string): { url: string; variantId: string | null } | null {
  const u = new URL(pageUrl);
  const handle = u.pathname.match(/\/products\/([a-z0-9-]+)\/?$/i)?.[1];
  if (!handle) return null;
  return { url: `${u.origin}/products/${handle}.js`, variantId: u.searchParams.get("variant") };
}

/** Prices in Shopify's .js data are integer cents in the store's own currency. */
export function resultFromShopifyProduct(json: unknown, variantId: string | null): ScrapeResult {
  const variants = (json as { variants?: ShopifyVariant[] } | null)?.variants;
  if (!Array.isArray(variants) || !variants.length) return emptyResult("failed", "no_price");
  const v = variantId ? variants.find((x) => String(x.id) === variantId) : variants[0];
  if (!v) return emptyResult("failed", "no_variant");
  if (!Number.isInteger(v.price) || v.price <= 0) return emptyResult("failed", "no_price");
  return {
    ...emptyResult("ok"),
    priceCents: v.price,
    wasPriceCents: v.compare_at_price && v.compare_at_price > v.price ? v.compare_at_price : null,
    inStockOnline: v.available ?? null,
    colour: v.title ?? null,
  };
}

/** Brand stores on Shopify (e.g. Sihoo): reads the product's public JSON instead of the page. */
export const shopifyAdapter: MerchantAdapter = {
  merchantSlug: "shopify",
  needsBrowser: false,
  async scrape(url) {
    const target = productJsonUrl(url);
    if (!target) return emptyResult("failed", "bad_url");
    const { status, html } = await fetchHtml(target.url);
    if (status === 429 || status === 403) return emptyResult("blocked");
    if (status === 404 || status === 410) return emptyResult("not_found");
    if (status >= 400) return emptyResult("failed", `http_${status}`);
    try {
      return resultFromShopifyProduct(JSON.parse(html), target.variantId);
    } catch {
      return emptyResult("failed", "no_price");
    }
  },
};
