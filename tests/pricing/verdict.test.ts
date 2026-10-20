import { describe, expect, it } from "vitest";
import { greatThresholdCents, verdict } from "@/lib/pricing/verdict";
import { isPlausible } from "@/lib/pricing/plausible";
import { monitor, speaker } from "../helpers/factories";

const stats = (over = {}) => ({ allTimeLowCents: null, typical30dCents: null, max60dCents: null, historyDays: 0, ...over });

describe("greatThresholdCents", () => {
  it("uses the bottom of a range, or 95% of a single target", () => {
    expect(greatThresholdCents(speaker())).toBe(21000);
    expect(greatThresholdCents(monitor())).toBe(104500);
  });
});

describe("verdict", () => {
  const mon = monitor();

  it("is unknown without a price", () => {
    expect(verdict({ bestCents: null, product: mon, stats: stats(), wasPriceCents: null }).level).toBe("unknown");
  });

  it("calls an all-time low with at least a week of history", () => {
    const v = verdict({ bestCents: 106000, product: mon, stats: stats({ allTimeLowCents: 108000, historyDays: 10 }), wasPriceCents: null });
    expect(v.level).toBe("all_time_low");
  });

  it("does not call an all-time low with under a week of history", () => {
    const v = verdict({ bestCents: 106000, product: mon, stats: stats({ allTimeLowCents: 108000, historyDays: 3 }), wasPriceCents: null });
    expect(v.level).toBe("target");
  });

  it("respects a reference low entered by the owner", () => {
    const v = verdict({
      bestCents: 106000,
      product: monitor({ referenceLowCents: 99999 }),
      stats: stats({ allTimeLowCents: 108000, historyDays: 10 }),
      wasPriceCents: null,
    });
    expect(v.level).toBe("target");
  });

  it("grades target and great for a single-target monitor", () => {
    const low = stats({ allTimeLowCents: 100000, historyDays: 10 });
    expect(verdict({ bestCents: 106000, product: mon, stats: low, wasPriceCents: null }).level).toBe("target");
    expect(verdict({ bestCents: 104000, product: mon, stats: low, wasPriceCents: null }).level).toBe("great");
  });

  it("grades target and great for a speaker range", () => {
    expect(verdict({ bestCents: 23000, product: speaker(), stats: stats(), wasPriceCents: null }).level).toBe("target");
    expect(verdict({ bestCents: 20900, product: speaker(), stats: stats(), wasPriceCents: null }).level).toBe("great");
  });

  it("grades fair against the 30-day typical price, otherwise not a deal", () => {
    const s = stats({ typical30dCents: 140000, historyDays: 5 });
    expect(verdict({ bestCents: 126000, product: mon, stats: s, wasPriceCents: null }).level).toBe("fair");
    expect(verdict({ bestCents: 140000, product: mon, stats: s, wasPriceCents: null }).level).toBe("not_a_deal");
  });

  it("explains a target hit in plain words", () => {
    const v = verdict({ bestCents: 106000, product: mon, stats: stats(), wasPriceCents: null });
    expect(v.reasons).toContain("Below your $1,100.00 target");
  });

  it("flags an inflated was-price against history or MSRP", () => {
    const hist = stats({ max60dCents: 150000, historyDays: 10 });
    expect(verdict({ bestCents: 140000, product: mon, stats: hist, wasPriceCents: 179999 }).inflatedWas).toBe(true);
    expect(verdict({ bestCents: 140000, product: mon, stats: stats({ historyDays: 2 }), wasPriceCents: 150000 }).inflatedWas).toBe(false);
    expect(verdict({ bestCents: 140000, product: mon, stats: stats({ historyDays: 2 }), wasPriceCents: 159999 }).inflatedWas).toBe(true);
  });
});

describe("isPlausible", () => {
  it("rejects prices far from MSRP", () => {
    expect(isPlausible(999, 150000)).toBe(false);
    expect(isPlausible(0, 150000)).toBe(false);
    expect(isPlausible(106000, 150000)).toBe(true);
    expect(isPlausible(500000, 150000)).toBe(false);
  });
});
