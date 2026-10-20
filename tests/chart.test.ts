import { describe, expect, it } from "vitest";
import { buildChartSeries } from "@/lib/chart";

describe("buildChartSeries", () => {
  it("builds one row per day with the best price and each store's price in dollars", () => {
    expect(
      buildChartSeries([
        { day: "2026-11-27", merchantSlug: "canada-computers", cents: 114900 },
        { day: "2026-11-27", merchantSlug: "best-buy", cents: 119900 },
        { day: "2026-11-26", merchantSlug: "best-buy", cents: 129999 },
      ]),
    ).toEqual([
      { date: "2026-11-26", best: 1299.99, "best-buy": 1299.99 },
      { date: "2026-11-27", best: 1149, "canada-computers": 1149, "best-buy": 1199 },
    ]);
  });

  it("keeps a store's lowest listing when it has several", () => {
    const rows = buildChartSeries([
      { day: "2026-11-27", merchantSlug: "canada-computers", cents: 120000 },
      { day: "2026-11-27", merchantSlug: "canada-computers", cents: 118000 },
    ]);
    expect(rows[0]["canada-computers"]).toBe(1180);
  });

  it("is empty without data", () => {
    expect(buildChartSeries([])).toEqual([]);
  });
});
