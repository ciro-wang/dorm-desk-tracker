import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { extractJsonLdOffer } from "@/lib/scraper/jsonld";

const fx = (f: string) => readFileSync(path.resolve(__dirname, "../fixtures/generic", f), "utf8");

describe("extractJsonLdOffer", () => {
  it("reads a plain Offer", () => {
    expect(extractJsonLdOffer(fx("product-cad.html"))).toEqual({
      priceCents: 114900,
      currency: "CAD",
      availability: "in_stock",
      condition: "new",
      sellerName: "Example Store",
      multiOffer: false,
    });
  });

  it("finds the Product inside @graph and reads stock", () => {
    expect(extractJsonLdOffer(fx("product-graph.html"))).toMatchObject({ priceCents: 49999, availability: "out_of_stock" });
  });

  it("uses lowPrice of an AggregateOffer", () => {
    expect(extractJsonLdOffer(fx("product-aggregate.html"))?.priceCents).toBe(99999);
  });

  it("reports used items as refurbished-or-open-box condition", () => {
    expect(extractJsonLdOffer(fx("product-openbox-marketplace.html"))?.condition).toBe("open_box");
  });

  it("returns null without product JSON-LD", () => {
    expect(extractJsonLdOffer("<html><body>$1,149.00</body></html>")).toBeNull();
  });

  it("survives malformed JSON-LD blocks", () => {
    expect(extractJsonLdOffer(`<script type="application/ld+json">{not json</script>`)).toBeNull();
  });
});
