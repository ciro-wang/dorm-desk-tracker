import { describe, expect, it } from "vitest";
import { buildWatchRow } from "@/lib/dashboard";
import { listing, log, monitor } from "./helpers/factories";

const now = new Date("2026-11-27T12:00:00Z");
const mon = monitor();

describe("buildWatchRow", () => {
  it("summarises best price, verdict, badges and the 7-day change", () => {
    const a = listing({ productId: mon.id });
    const row = buildWatchRow(mon, [{ listing: a, latest: log(a.id, { priceCents: 106000, wasPriceCents: 150000 }) }], [
      { at: new Date("2026-11-20T17:00:00Z"), cents: 129999 },
      { at: new Date("2026-11-27T11:00:00Z"), cents: 106000 },
    ], [], now);
    expect(row.best?.cents).toBe(106000);
    expect(row.verdict.level).toBe("all_time_low");
    expect(row.changeVs7dCents).toBe(106000 - 129999);
    expect(row.badges).toContain("target_reached");
    expect(row.emptyMessage).toBeNull();
  });

  it("shows no price when every listing is stale, instead of the old number", () => {
    const a = listing({ productId: mon.id });
    const row = buildWatchRow(mon, [{ listing: a, latest: log(a.id, { checkedAt: "2026-11-26T00:00:00Z" }) }], [], [], now);
    expect(row.best).toBeNull();
    expect(row.verdict.level).toBe("unknown");
    expect(row.emptyMessage).toBe("No verified price, check manually");
  });
});
