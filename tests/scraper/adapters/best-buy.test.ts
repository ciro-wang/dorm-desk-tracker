import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/scraper/http", () => ({ fetchHtml: vi.fn(), fetchRenderedHtml: vi.fn() }));
import { fetchHtml } from "@/lib/scraper/http";
import { bestBuyAdapter, bestBuySku, parseBestBuyAvailability } from "@/lib/scraper/adapters/best-buy";
import { getAdapter } from "@/lib/scraper/registry";

// Fixtures are an ordinary, non-watchlist product captured 2026-10-20.
const fx = (f: string) => readFileSync(path.resolve(__dirname, "../../fixtures/best-buy", f), "utf8");
const json = (f: string) => JSON.parse(fx(f).replace(/^﻿/, ""));
const url = "https://www.bestbuy.ca/en-ca/product/lg-ultragear-27-4k-uhd-ips-led-gaming-monitor-27gn950-b/14828470";
const ctx = { pickupStoreIds: ["S1"], merchantName: "Best Buy" };

describe("bestBuySku", () => {
  it("reads the sku from a product url", () => {
    expect(bestBuySku(url)).toBe("14828470");
    expect(bestBuySku("https://www.bestbuy.ca/en-ca/product/x/14828470?foo=1")).toBe("14828470");
    expect(bestBuySku("https://www.bestbuy.ca/en-ca/category/x")).toBeNull();
  });
});

describe("parseBestBuyAvailability", () => {
  it("reads a sold-out-online product with no pickup stores listed", () => {
    expect(parseBestBuyAvailability(json("availability-14828470.json"))).toEqual({ inStockOnline: false, shippingCents: null, pickup: [] });
  });

  it("reads online stock and the cheapest shipping option", () => {
    const a = parseBestBuyAvailability({
      availabilities: [{ shipping: { status: "InStock", isFreeShippingEligible: false, levelsOfServices: [{ price: 10.99 }, { price: 24.99 }] }, pickup: { locations: [] } }],
    });
    expect(a).toMatchObject({ inStockOnline: true, shippingCents: 1099 });
  });

  it("reads pickup locations in the shape Best Buy uses (unverified shape)", () => {
    const a = parseBestBuyAvailability({
      availabilities: [
        {
          pickup: {
            status: "InStock",
            locations: [
              { locationKey: "S1", name: "Store One", quantityOnHand: 2, hasInventory: true },
              { locationKey: "S2", name: "Store Two", quantityOnHand: 0, hasInventory: false },
            ],
          },
          shipping: { status: "SoldOutOnline", levelsOfServices: [] },
        },
      ],
    });
    expect(a.pickup).toEqual([
      { externalStoreId: "S1", storeName: "Store One", inStock: true },
      { externalStoreId: "S2", storeName: "Store Two", inStock: false },
    ]);
    expect(a.inStockOnline).toBe(false);
  });
});

describe("bestBuyAdapter", () => {
  beforeEach(() => vi.mocked(fetchHtml).mockReset());

  it("combines product price and availability", async () => {
    vi.mocked(fetchHtml)
      .mockResolvedValueOnce({ status: 200, html: fx("product-14828470.json") })
      .mockResolvedValueOnce({ status: 200, html: fx("availability-14828470.json") });
    const r = await bestBuyAdapter.scrape(url, ctx);
    expect(r).toMatchObject({ status: "ok", priceCents: 99997, wasPriceCents: null, inStockOnline: false, condition: "new", seller: "retailer", pickup: [] });
    expect(vi.mocked(fetchHtml).mock.calls[1][0]).toContain("locations=S1");
  });

  it("records the regular price as the was-price during a sale, and spots open-box and marketplace items", async () => {
    vi.mocked(fetchHtml)
      .mockResolvedValueOnce({ status: 200, html: JSON.stringify({ name: "Open Box - Example Monitor", salePrice: 899.99, regularPrice: 1049.99, isMarketplace: true }) })
      .mockResolvedValueOnce({ status: 200, html: "{}" });
    expect(await bestBuyAdapter.scrape(url, ctx)).toMatchObject({ priceCents: 89999, wasPriceCents: 104999, condition: "open_box", seller: "marketplace" });
  });

  it("returns blocked when Best Buy denies access", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 403, html: fx("blocked.html") });
    expect(await bestBuyAdapter.scrape(url, ctx)).toMatchObject({ status: "blocked", priceCents: null });
  });

  it("fails cleanly for a url without a sku", async () => {
    expect(await bestBuyAdapter.scrape("https://www.bestbuy.ca/en-ca/category/x", ctx)).toMatchObject({ status: "failed", error: "no_sku" });
  });

  it("is registered for its merchant slug", () => {
    expect(getAdapter("best-buy")).toBe(bestBuyAdapter);
  });
});
