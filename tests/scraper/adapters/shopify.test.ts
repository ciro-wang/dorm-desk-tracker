import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/scraper/http", () => ({ fetchHtml: vi.fn(), fetchRenderedHtml: vi.fn() }));
import { fetchHtml } from "@/lib/scraper/http";
import { productJsonUrl, resultFromShopifyProduct, shopifyAdapter } from "@/lib/scraper/adapters/shopify";
import { getAdapter } from "@/lib/scraper/registry";

// A made-up product in the shape Shopify's /products/<handle>.js returns (prices in cents).
const json = readFileSync(path.resolve(__dirname, "../../fixtures/shopify/product.js.json"), "utf8");
const ctx = { pickupStoreIds: [], merchantName: "Example Store" };

describe("productJsonUrl", () => {
  it("points at the product's .js data and keeps the chosen variant", () => {
    expect(productJsonUrl("https://shop.example.com/products/example-mesh-chair?variant=222")).toEqual({
      url: "https://shop.example.com/products/example-mesh-chair.js",
      variantId: "222",
    });
    expect(productJsonUrl("https://shop.example.com/collections/chairs/products/example-mesh-chair")?.variantId).toBeNull();
    expect(productJsonUrl("https://shop.example.com/pages/about")).toBeNull();
  });
});

describe("resultFromShopifyProduct", () => {
  it("reads the chosen variant's price, compare-at price and stock", () => {
    expect(resultFromShopifyProduct(JSON.parse(json), "111")).toMatchObject({
      status: "ok",
      priceCents: 29999,
      wasPriceCents: 44999,
      inStockOnline: true,
      seller: "retailer",
      condition: "new",
      colour: "Grey / Standard",
    });
  });

  it("ignores a compare-at price that isn't higher, and reports out of stock", () => {
    expect(resultFromShopifyProduct(JSON.parse(json), "222")).toMatchObject({ priceCents: 34999, wasPriceCents: null, inStockOnline: false });
  });

  it("uses the first variant when none is chosen and fails on an unknown one", () => {
    expect(resultFromShopifyProduct(JSON.parse(json), null).priceCents).toBe(29999);
    expect(resultFromShopifyProduct(JSON.parse(json), "999")).toMatchObject({ status: "failed", error: "no_variant" });
    expect(resultFromShopifyProduct({ nope: true }, null)).toMatchObject({ status: "failed", error: "no_price" });
  });
});

describe("shopifyAdapter", () => {
  it("is used for both Sihoo stores", () => {
    expect(getAdapter("sihoo-ca")).toBe(shopifyAdapter);
    expect(getAdapter("sihoo-us")).toBe(shopifyAdapter);
  });

  it("fetches the .js data and treats rate limits as blocked", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 200, html: json });
    expect((await shopifyAdapter.scrape("https://shop.example.com/products/example-mesh-chair?variant=111", ctx)).priceCents).toBe(29999);
    expect(vi.mocked(fetchHtml)).toHaveBeenLastCalledWith("https://shop.example.com/products/example-mesh-chair.js");

    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 429, html: "Too many requests" });
    expect((await shopifyAdapter.scrape("https://shop.example.com/products/example-mesh-chair", ctx)).status).toBe("blocked");
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 404, html: "" });
    expect((await shopifyAdapter.scrape("https://shop.example.com/products/example-mesh-chair", ctx)).status).toBe("not_found");
    expect((await shopifyAdapter.scrape("https://shop.example.com/pages/about", ctx))).toMatchObject({ status: "failed", error: "bad_url" });
  });
});
