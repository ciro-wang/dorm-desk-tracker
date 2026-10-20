import { describe, expect, it } from "vitest";
import { historyStats } from "@/lib/pricing/stats";

const now = new Date("2026-11-27T12:00:00Z");
const at = (iso: string, cents: number) => ({ at: new Date(iso), cents });

describe("historyStats", () => {
  it("computes low, 30-day median of daily mins, 60-day max and history length", () => {
    const s = historyStats(
      [
        at("2026-11-17T15:00:00Z", 120500),
        at("2026-11-17T18:00:00Z", 120000),
        at("2026-11-20T15:00:00Z", 118000),
        at("2026-11-25T15:00:00Z", 125000),
      ],
      now,
    );
    expect(s).toEqual({ allTimeLowCents: 118000, typical30dCents: 120000, max60dCents: 125000, historyDays: 10 });
  });

  it("excludes points outside the windows", () => {
    const s = historyStats([at("2026-08-01T15:00:00Z", 90000), at("2026-11-26T15:00:00Z", 120000)], now);
    expect(s.allTimeLowCents).toBe(90000);
    expect(s.typical30dCents).toBe(120000);
    expect(s.max60dCents).toBe(120000);
  });

  it("returns nulls without history", () => {
    expect(historyStats([], now)).toEqual({ allTimeLowCents: null, typical30dCents: null, max60dCents: null, historyDays: 0 });
  });
});
