import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/scraper/http", () => ({ fetchHtml: vi.fn(), fetchRenderedHtml: vi.fn() }));
import { fetchHtml } from "@/lib/scraper/http";
import { genericAdapter } from "@/lib/scraper/adapters/generic";
import { getAdapter } from "@/lib/scraper/registry";

const fx = (f: string) => readFileSync(path.resolve(__dirname, "../fixtures/generic", f), "utf8");
const ctx = { pickupStoreIds: [], merchantName: "Example Store" };
const respond = (status: number, html: string) => vi.mocked(fetchHtml).mockResolvedValueOnce({ status, html });

describe("genericAdapter", () => {
  beforeEach(() => vi.mocked(fetchHtml).mockReset());

  it("returns ok with the CAD price and online stock", async () => {
    respond(200, fx("product-cad.html"));
    expect(await genericAdapter.scrape("https://example.ca/p", ctx)).toEqual({
      status: "ok",
      priceCents: 114900,
      wasPriceCents: null,
      shippingCents: null,
      inStockOnline: true,
      pickup: [],
      condition: "new",
      seller: "retailer",
      colour: null,
      error: null,
    });
  });

  it("returns blocked for a captcha page, never a price", async () => {
    respond(200, fx("robot-check.html"));
    expect(await genericAdapter.scrape("https://example.ca/p", ctx)).toMatchObject({ status: "blocked", priceCents: null });
  });

  it("returns not_found on 404", async () => {
    respond(404, "<html></html>");
    expect((await genericAdapter.scrape("https://example.ca/p", ctx)).status).toBe("not_found");
  });

  it("rejects non-CAD prices", async () => {
    respond(200, fx("product-usd.html"));
    expect(await genericAdapter.scrape("https://example.ca/p", ctx)).toMatchObject({ status: "failed", error: "non_cad", priceCents: null });
  });

  it("fails with no_price when there is no offer", async () => {
    respond(200, "<html><body>$1,149.00</body></html>");
    expect(await genericAdapter.scrape("https://example.ca/p", ctx)).toMatchObject({ status: "failed", error: "no_price" });
  });

  it("treats an AggregateOffer low price as a marketplace offer, never the retailer's price", async () => {
    respond(200, fx("product-aggregate.html"));
    expect(await genericAdapter.scrape("https://example.ca/p", ctx)).toMatchObject({ status: "ok", priceCents: 99999, seller: "marketplace" });
  });

  it("accepts an AggregateOffer that covers a single offer", async () => {
    respond(200, `<script type="application/ld+json">{"@type":"Product","offers":{"@type":"AggregateOffer","lowPrice":"999.99","offerCount":1,"priceCurrency":"CAD"}}</script>`);
    expect(await genericAdapter.scrape("https://example.ca/p", ctx)).toMatchObject({ seller: "retailer" });
  });

  it("marks third-party sellers as marketplace", async () => {
    respond(200, fx("product-openbox-marketplace.html"));
    expect(await genericAdapter.scrape("https://example.ca/p", ctx)).toMatchObject({ seller: "marketplace", condition: "open_box" });
  });
});

describe("getAdapter", () => {
  it("falls back to the generic adapter", () => {
    expect(getAdapter("visions")).toBe(genericAdapter);
  });
});
