import { describe, expect, it } from "vitest";
import { bestPriceNow, effectiveCents, isStale } from "@/lib/pricing/best-price";
import { listing, log } from "../helpers/factories";

const now = new Date("2026-11-27T12:00:00Z");

describe("effectiveCents", () => {
  it("adds known shipping", () => {
    expect(effectiveCents({ priceCents: 100000, shippingCents: 2500 })).toBe(102500);
    expect(effectiveCents({ priceCents: 100000, shippingCents: null })).toBe(100000);
    expect(effectiveCents({ priceCents: null, shippingCents: 2500 })).toBeNull();
  });
});

describe("isStale", () => {
  it("treats checks older than 6 hours as stale", () => {
    expect(isStale("2026-11-27T05:59:00Z", now)).toBe(true);
    expect(isStale("2026-11-27T06:01:00Z", now)).toBe(false);
  });
});

describe("bestPriceNow", () => {
  it("picks the cheapest countable listing", () => {
    const a = listing();
    const b = listing();
    const best = bestPriceNow(
      [
        { listing: a, latest: log(a.id, { priceCents: 119000 }) },
        { listing: b, latest: log(b.id, { priceCents: 114900 }) },
      ],
      now,
      [],
    );
    expect(best).toMatchObject({ listingId: b.id, merchantId: b.merchantId, cents: 114900, source: "scraped", pickupNearby: false });
  });

  it("ignores open-box, marketplace, bundles, failed and stale logs", () => {
    const real = listing();
    const openBox = listing();
    const market = listing();
    const bundle = listing({ isBundle: true });
    const failed = listing();
    const stale = listing();
    const best = bestPriceNow(
      [
        { listing: real, latest: log(real.id, { priceCents: 119000 }) },
        { listing: openBox, latest: log(openBox.id, { priceCents: 90000, condition: "open_box" }) },
        { listing: market, latest: log(market.id, { priceCents: 91000, seller: "marketplace" }) },
        { listing: bundle, latest: log(bundle.id, { priceCents: 92000 }) },
        { listing: failed, latest: log(failed.id, { priceCents: 93000, status: "failed" }) },
        { listing: stale, latest: log(stale.id, { priceCents: 94000, checkedAt: "2026-11-27T05:00:00Z" }) },
      ],
      now,
      [],
    );
    expect(best?.listingId).toBe(real.id);
  });

  it("counts a marketplace seller only when you have marked that listing as trusted", () => {
    const retailer = listing();
    const reseller = listing();
    const trusted = listing({ trustedSeller: true });
    const best = bestPriceNow(
      [
        { listing: retailer, latest: log(retailer.id, { priceCents: 119000 }) },
        { listing: reseller, latest: log(reseller.id, { priceCents: 90000, seller: "marketplace" }) },
        { listing: trusted, latest: log(trusted.id, { priceCents: 95000, seller: "marketplace" }) },
      ],
      now,
      [],
    );
    expect(best?.listingId).toBe(trusted.id);
  });

  it("does not let a trusted seller's open-box offer count", () => {
    const trusted = listing({ trustedSeller: true });
    expect(bestPriceNow([{ listing: trusted, latest: log(trusted.id, { seller: "marketplace", condition: "open_box" }) }], now, [])).toBeNull();
  });

  it("returns null when every listing is stale or failed", () => {
    const a = listing();
    const b = listing();
    expect(
      bestPriceNow(
        [
          { listing: a, latest: log(a.id, { checkedAt: "2026-11-26T12:00:00Z" }) },
          { listing: b, latest: log(b.id, { status: "blocked", priceCents: null }) },
        ],
        now,
        [],
      ),
    ).toBeNull();
    expect(bestPriceNow([{ listing: a, latest: null }], now, [])).toBeNull();
  });

  it("counts a recent manual entry", () => {
    const a = listing();
    const best = bestPriceNow([{ listing: a, latest: log(a.id, { source: "manual", checkedAt: "2026-11-27T10:00:00Z" }) }], now, []);
    expect(best?.source).toBe("manual");
  });

  it("compares prices including shipping", () => {
    const a = listing();
    const b = listing();
    const best = bestPriceNow(
      [
        { listing: a, latest: log(a.id, { priceCents: 100000, shippingCents: 2500 }) },
        { listing: b, latest: log(b.id, { priceCents: 102000, shippingCents: 0 }) },
      ],
      now,
      [],
    );
    expect(best).toMatchObject({ listingId: b.id, cents: 102000 });
  });

  it("flags downtown pickup only for in-stock watched stores on the winning listing", () => {
    const a = listing();
    const pickup = [
      { externalStoreId: "cc-downtown", storeName: "Downtown", inStock: true },
      { externalStoreId: "cc-far", storeName: "Far", inStock: true },
    ];
    expect(bestPriceNow([{ listing: a, latest: log(a.id, { pickup }) }], now, ["cc-downtown"])?.pickupNearby).toBe(true);
    expect(bestPriceNow([{ listing: a, latest: log(a.id, { pickup }) }], now, ["other"])?.pickupNearby).toBe(false);
    expect(
      bestPriceNow([{ listing: a, latest: log(a.id, { pickup: [{ ...pickup[0], inStock: false }] }) }], now, ["cc-downtown"])?.pickupNearby,
    ).toBe(false);
  });
});

describe("pickupAtTarget", () => {
  const pick = (id: string, inStock: boolean) => [{ externalStoreId: id, storeName: "Store", inStock }];

  it("finds a pricier listing that is still at target and has pickup", async () => {
    const { pickupAtTarget } = await import("@/lib/pricing/best-price");
    const cheap = listing();
    const pricier = listing();
    const r = pickupAtTarget(
      [
        { listing: cheap, latest: log(cheap.id, { priceCents: 104000 }) },
        { listing: pricier, latest: log(pricier.id, { priceCents: 108000, pickup: pick("S1", true) }) },
      ],
      now,
      ["S1"],
      110000,
    );
    expect(r).toEqual({ available: true, cents: 108000, merchantId: pricier.merchantId });
  });

  it("is false when fresh at-target listings have no pickup, and unknown when nothing fresh was observed", async () => {
    const { pickupAtTarget } = await import("@/lib/pricing/best-price");
    const a = listing();
    expect(pickupAtTarget([{ listing: a, latest: log(a.id, { priceCents: 104000, pickup: pick("S1", false) }) }], now, ["S1"], 110000)).toEqual({ available: false });
    expect(pickupAtTarget([{ listing: a, latest: log(a.id, { status: "failed", priceCents: null }) }], now, ["S1"], 110000)).toEqual({ available: null });
    expect(pickupAtTarget([{ listing: a, latest: log(a.id, { priceCents: 120000, pickup: pick("S1", true) }) }], now, ["S1"], 110000)).toEqual({ available: false });
  });
});

describe("effectiveLog", () => {
  it("keeps a fresh manual price when a later automatic check was blocked", async () => {
    const { effectiveLog } = await import("@/lib/pricing/best-price");
    const manual = log("l", { source: "manual", priceCents: 104900, checkedAt: "2026-11-27T11:00:00Z" });
    const blocked = log("l", { status: "blocked", priceCents: null, checkedAt: "2026-11-27T11:30:00Z" });
    expect(effectiveLog(blocked, manual, now)).toBe(manual);
  });

  it("uses the newest check when the last good one is stale or missing", async () => {
    const { effectiveLog } = await import("@/lib/pricing/best-price");
    const old = log("l", { checkedAt: "2026-11-26T00:00:00Z" });
    const blocked = log("l", { status: "blocked", priceCents: null });
    expect(effectiveLog(blocked, old, now)).toBe(blocked);
    expect(effectiveLog(blocked, null, now)).toBe(blocked);
    expect(effectiveLog(null, null, now)).toBeNull();
  });
});
