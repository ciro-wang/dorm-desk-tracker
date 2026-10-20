import { describe, expect, it } from "vitest";
import { ManualPriceInput } from "@/lib/validation";

const ok = { listingId: "3f6c2a7e-1b2d-4c3e-8f9a-0b1c2d3e4f5a", price: "1149.00", inStockOnline: "yes", pickupInStock: "unknown" };

describe("ManualPriceInput", () => {
  it("accepts a normal entry and converts the price to cents", () => {
    expect(ManualPriceInput.parse(ok)).toEqual({ listingId: ok.listingId, priceCents: 114900, inStockOnline: "yes", pickupInStock: "unknown" });
  });

  it("rejects zero, negative, sub-cent and non-numeric prices", () => {
    for (const price of ["0", "-5", "1149.999", "abc", "", "20000.01", "1e3"]) {
      expect(ManualPriceInput.safeParse({ ...ok, price }).success, price).toBe(false);
    }
  });

  it("rejects a listing id that is not a uuid", () => {
    expect(ManualPriceInput.safeParse({ ...ok, listingId: "1; drop table" }).success).toBe(false);
  });

  it("rejects unknown stock values", () => {
    expect(ManualPriceInput.safeParse({ ...ok, inStockOnline: "maybe" }).success).toBe(false);
  });
});

describe("listing urls", () => {
  it("accept only https urls on the merchant's own domain", async () => {
    const { isMerchantUrl } = await import("@/lib/merchants");
    expect(isMerchantUrl("https://www.canadacomputers.com/en/x/1/y.html", "canada-computers")).toBe(true);
    expect(isMerchantUrl("https://www.bestbuy.ca/en-ca/product/x/123", "best-buy")).toBe(true);
    expect(isMerchantUrl("https://www.canadacomputers.com/en/x", "best-buy")).toBe(false);
    expect(isMerchantUrl("http://www.bestbuy.ca/en-ca/product/x/123", "best-buy")).toBe(false);
    expect(isMerchantUrl("javascript:alert(1)", "best-buy")).toBe(false);
    expect(isMerchantUrl("https://bestbuy.ca.evil.example/x", "best-buy")).toBe(false);
    expect(isMerchantUrl("https://notbestbuy.ca/x", "best-buy")).toBe(false);
    expect(isMerchantUrl("not a url", "best-buy")).toBe(false);
  });
});

describe("TargetsInput", () => {
  it("rejects a low target above the high target", async () => {
    const { TargetsInput } = await import("@/lib/validation");
    const base = { productId: "3f6c2a7e-1b2d-4c3e-8f9a-0b1c2d3e4f5a", active: "on", alertsEnabled: "on" };
    expect(TargetsInput.safeParse({ ...base, targetHigh: "240", targetLow: "260" }).success).toBe(false);
    expect(TargetsInput.parse({ ...base, targetHigh: "240", targetLow: "210" })).toEqual({
      productId: base.productId,
      targetHighCents: 24000,
      targetLowCents: 21000,
      active: true,
      alertsEnabled: true,
    });
    expect(TargetsInput.parse({ productId: base.productId, targetHigh: "1100", targetLow: "1100" })).toMatchObject({ active: false, alertsEnabled: false });
  });
});

describe("targets for single-target products (monitors)", () => {
  it("defaults the low end to the target when it isn't sent", async () => {
    const { TargetsInput } = await import("@/lib/validation");
    expect(TargetsInput.parse({ productId: "3f6c2a7e-1b2d-4c3e-8f9a-0b1c2d3e4f5a", targetHigh: "1000" })).toMatchObject({ targetHighCents: 100000, targetLowCents: 100000 });
  });

  it("keeps a monitor single-target whatever low end arrives", async () => {
    const { normalizeTargets } = await import("@/lib/validation");
    expect(normalizeTargets("monitor", { targetHighCents: 100000, targetLowCents: 110000 })).toEqual({ targetHighCents: 100000, targetLowCents: 100000 });
    expect(normalizeTargets("monitor", { targetHighCents: 130000, targetLowCents: 110000 })).toEqual({ targetHighCents: 130000, targetLowCents: 130000 });
    expect(normalizeTargets("speaker", { targetHighCents: 24000, targetLowCents: 21000 })).toEqual({ targetHighCents: 24000, targetLowCents: 21000 });
  });
});
