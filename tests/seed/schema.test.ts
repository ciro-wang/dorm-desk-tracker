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

  it("lists exactly the ten merchants", () => {
    expect(parseSeed(example).merchants.map((m) => m.slug).sort()).toEqual(
      ["amazon", "bay-bloor-radio", "best-buy", "canada-computers", "crutchfield", "dell", "fluance", "memory-express", "newegg", "visions"].sort(),
    );
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

  it("rejects a non-https listing url", () => {
    const s = clone();
    s.listings = [{ productSlug: s.products[0].slug, merchantSlug: "best-buy", url: "http://www.bestbuy.ca/x" }];
    expect(() => parseSeed(s)).toThrow();
  });
});
