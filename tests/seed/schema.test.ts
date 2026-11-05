import { MERCHANT_DOMAINS } from "@/lib/merchants";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseSeed } from "@/lib/seed/schema";

const example = JSON.parse(readFileSync(path.resolve(__dirname, "../../seed.example.json"), "utf8"));
const clone = () => structuredClone(example);

describe("parseSeed", () => {
  it("accepts the committed example", () => {
    expect(() => parseSeed(example)).not.toThrow();
  });

  it("lists exactly the merchants the scraper knows the domains of", () => {
    expect(parseSeed(example).merchants.map((m) => m.slug).sort()).toEqual(Object.keys(MERCHANT_DOMAINS).sort());
  });

  it("accepts purchases and US-dollar listings", () => {
    const s = parseSeed({
      ...example,
      listings: [{ productSlug: example.products[0].slug, merchantSlug: "sihoo-us", url: "https://sihoo.com/products/x", currency: "USD" }],
      purchases: [{ productSlug: example.products[0].slug, merchantSlug: "amazon", paid: 100, purchasedOn: "2026-11-02", claimBy: "2026-12-02" }],
    });
    expect(s.listings[0].currency).toBe("USD");
    expect(s.purchases[0]).toMatchObject({ paid: 100, claimNote: "" });
    expect(() => parseSeed({ ...example, purchases: [{ productSlug: "nope", merchantSlug: "amazon", paid: 1, purchasedOn: "2026-11-02", claimBy: "2026-12-02" }] })).toThrow();
  });

  it("rejects targetLow above targetHigh", () => {
    const s = clone();
    s.products[0].targetLow = s.products[0].targetHigh + 1;
    expect(() => parseSeed(s)).toThrow();
  });

  it("rejects a monitor without panelHeightCm", () => {
    const s = clone();
    const m = s.products.find((p: { category: string }) => p.category === "monitor");
    delete m.specs.panelHeightCm;
    expect(() => parseSeed(s)).toThrow();
  });

  it("rejects a listing for an unknown product", () => {
    const s = clone();
    s.listings = [{ productSlug: "nope", merchantSlug: "best-buy", url: "https://www.bestbuy.ca/x" }];
    expect(() => parseSeed(s)).toThrow();
  });

  it("accepts a trusted-seller flag on listings and defaults it to off", () => {
    const s = clone();
    s.listings = [
      { productSlug: s.products[0].slug, merchantSlug: "amazon", url: "https://www.amazon.ca/dp/B000000001", trustedSeller: true },
      { productSlug: s.products[0].slug, merchantSlug: "amazon", url: "https://www.amazon.ca/dp/B000000002" },
    ];
    expect(parseSeed(s).listings.map((l) => l.trustedSeller)).toEqual([true, false]);
  });

  it("rejects a non-https listing url", () => {
    const s = clone();
    s.listings = [{ productSlug: s.products[0].slug, merchantSlug: "best-buy", url: "http://www.bestbuy.ca/x" }];
    expect(() => parseSeed(s)).toThrow();
  });
});
