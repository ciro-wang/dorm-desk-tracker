import { describe, expect, it } from "vitest";
import { decidePurchaseAlert, formatPurchaseAlert, lowestOffer } from "@/lib/alerts/purchase";
import type { Purchase } from "@/lib/types";
import { listing, log, monitor } from "../helpers/factories";

const now = new Date("2026-11-27T15:00:00Z");
const at = "2026-11-27T14:30:00Z";
const purchase: Purchase = {
  id: "pu-1",
  productId: "p-mon",
  merchantId: "m-shop",
  paidCents: 41900,
  paidTotalCents: 47347,
  purchasedOn: "2026-11-02",
  claimBy: "2026-12-10",
  claimNote: "30 days from delivery",
  lastAlertedCents: null,
};
const names = new Map([["m-shop", "Example Shop"], ["m-us", "Example Shop US"]]);
const shop = listing({ merchantId: "m-shop" });
const us = listing({ merchantId: "m-us", currency: "USD" });

describe("lowestOffer", () => {
  it("finds the lowest new price across stores, US stores included (already in CAD)", () => {
    const offer = lowestOffer(
      [
        { listing: shop, latest: log(shop.id, { priceCents: 32999, checkedAt: at }) },
        { listing: us, latest: log(us.id, { priceCents: 31000, checkedAt: at, nativePriceCents: 22299, nativeCurrency: "USD" }) },
      ],
      purchase,
      names,
      now,
    );
    expect(offer).toEqual({ cents: 31000, merchantName: "Example Shop US", sameStore: false, native: { cents: 22299, currency: "USD" } });
  });

  it("skips stale, open-box and untrusted marketplace prices", () => {
    expect(
      lowestOffer(
        [
          { listing: shop, latest: log(shop.id, { priceCents: 20000, checkedAt: "2026-11-26T00:00:00Z" }) },
          { listing: us, latest: log(us.id, { priceCents: 20000, checkedAt: at, condition: "open_box" }) },
        ],
        purchase,
        names,
        now,
      ),
    ).toBeNull();
  });
});

describe("decidePurchaseAlert", () => {
  const offer = { cents: 31999, merchantName: "Example Shop", sameStore: true, native: null };

  it("alerts when a price drops below what was paid, before the deadline", () => {
    expect(decidePurchaseAlert(purchase, offer, now)).toBe(true);
    expect(decidePurchaseAlert(purchase, { ...offer, cents: 41900 }, now)).toBe(false);
    expect(decidePurchaseAlert(purchase, null, now)).toBe(false);
  });

  it("only re-alerts on a lower price, and stops after the claim deadline", () => {
    expect(decidePurchaseAlert({ ...purchase, lastAlertedCents: 31999 }, offer, now)).toBe(false);
    expect(decidePurchaseAlert({ ...purchase, lastAlertedCents: 32999 }, offer, now)).toBe(true);
    expect(decidePurchaseAlert(purchase, offer, new Date("2026-12-11T05:30:00Z"))).toBe(false);
    expect(decidePurchaseAlert(purchase, offer, new Date("2026-12-11T04:30:00Z"))).toBe(true); // still Dec 10 in Toronto
  });
});

describe("formatPurchaseAlert", () => {
  it("says how much lower, where, and by when", () => {
    const n = formatPurchaseAlert(purchase, monitor(), { cents: 31999, merchantName: "Example Shop", sameStore: true, native: null }, "https://t.example.app/");
    expect(n).toEqual({
      title: "Example OLED Monitor M27X · $99.01 under what you paid",
      message: "$319.99 at Example Shop (you paid $419.00 there) · ask for the difference or return and rebuy by Dec 10",
      clickUrl: "https://t.example.app/product/example-monitor",
      priority: 4,
    });
  });

  it("shows the US price and says it is another store", () => {
    const n = formatPurchaseAlert(purchase, monitor(), { cents: 31000, merchantName: "Example Shop US", sameStore: false, native: { cents: 22299, currency: "USD" } }, "https://t.example.app");
    expect(n.message).toBe("US$222.99 (≈ $310.00) at Example Shop US · you paid $419.00 at another store · claim or return by Dec 10");
  });
});
