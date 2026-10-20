import { describe, expect, it } from "vitest";
import { listingFromRow, priceLogFromRow, priceLogToRow, productFromRow, alertStateFromRow, alertStateToRow } from "@/lib/db/mappers";
import { listing, log, monitor } from "../helpers/factories";

describe("db mappers", () => {
  it("round-trips a price log", () => {
    const l = log("l-1", { pickup: [{ externalStoreId: "S1", storeName: "Store One", inStock: true }], wasPriceCents: 159999 });
    const { id, ...rest } = l;
    expect(priceLogFromRow({ id, ...priceLogToRow(rest) })).toEqual(l);
  });

  it("maps product rows including specs", () => {
    const p = monitor();
    expect(
      productFromRow({
        id: p.id,
        slug: p.slug,
        name: p.name,
        category: p.category,
        msrp_cents: p.msrpCents,
        target_high_cents: p.targetHighCents,
        target_low_cents: p.targetLowCents,
        colour_prefs: p.colourPrefs,
        specs: p.specs,
        active: true,
        alerts_enabled: true,
        reference_low_cents: null,
      }),
    ).toEqual(p);
  });

  it("maps listing rows", () => {
    const l = listing();
    expect(
      listingFromRow({ id: l.id, product_id: l.productId, merchant_id: l.merchantId, url: l.url, is_bundle: false, bundle_contents: null, auto_check: true }),
    ).toEqual(l);
  });

  it("round-trips alert state", () => {
    const s = { productId: "p", lastAlertedCents: 109500, sentKinds: ["below_target" as const], pickupNearby: true, aboveTargetSince: null, pickupGoneSince: "2026-11-27T12:00:00.000Z" };
    expect(alertStateFromRow(alertStateToRow(s))).toEqual(s);
  });
});

describe("dailyRowsToPoints", () => {
  it("places each Toronto day at local noon so it buckets back to the same day", async () => {
    const { dailyRowsToPoints } = await import("@/lib/db/mappers");
    const { torontoDate } = await import("@/lib/time");
    const pts = dailyRowsToPoints([{ day: "2026-11-27", cents: 106000 }, { day: "2026-07-01", cents: 120000 }]);
    expect(pts.map((p) => torontoDate(p.at))).toEqual(["2026-11-27", "2026-07-01"]);
    expect(pts[0].cents).toBe(106000);
  });
});

describe("torontoDate", () => {
  it("uses Toronto, not UTC, calendar days", async () => {
    const { torontoDate } = await import("@/lib/time");
    expect(torontoDate(new Date("2026-11-28T03:00:00Z"))).toBe("2026-11-27");
  });
});
