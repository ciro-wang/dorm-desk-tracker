import { describe, expect, it } from "vitest";
import { isInSaleWindow } from "@/lib/jobs/schedule";

describe("isInSaleWindow (Toronto time)", () => {
  it("opens at midnight Toronto on Nov 20, not UTC", () => {
    expect(isInSaleWindow(new Date("2026-11-20T05:30:00Z"))).toBe(true);
    expect(isInSaleWindow(new Date("2026-11-20T04:30:00Z"))).toBe(false);
  });

  it("covers Boxing Week through Jan 3 inclusive", () => {
    expect(isInSaleWindow(new Date("2027-01-03T23:00:00-05:00"))).toBe(true);
    expect(isInSaleWindow(new Date("2027-01-04T05:30:00Z"))).toBe(false);
    expect(isInSaleWindow(new Date("2026-12-20T12:00:00-05:00"))).toBe(true);
  });

  it("is closed between the windows", () => {
    expect(isInSaleWindow(new Date("2026-12-10T12:00:00Z"))).toBe(false);
    expect(isInSaleWindow(new Date("2026-12-02T23:59:00-05:00"))).toBe(true);
    expect(isInSaleWindow(new Date("2026-12-03T00:01:00-05:00"))).toBe(false);
  });
});

describe("shouldRunNow", () => {
  const out = new Date("2026-11-10T15:00:00Z");
  const ago = (ms: number) => new Date(out.getTime() - ms);
  it("always runs inside a sale window", async () => {
    const { shouldRunNow } = await import("@/lib/jobs/schedule");
    expect(shouldRunNow(new Date("2026-11-21T15:00:00Z"), new Date("2026-11-21T14:45:00Z"))).toBe(true);
  });

  it("runs every 3 hours outside a window, with 5 minutes of slack", async () => {
    const { shouldRunNow } = await import("@/lib/jobs/schedule");
    expect(shouldRunNow(out, null)).toBe(true);
    expect(shouldRunNow(out, ago((2 * 60 + 50) * 60_000))).toBe(false);
    expect(shouldRunNow(out, ago((2 * 60 + 56) * 60_000))).toBe(true);
  });
});
