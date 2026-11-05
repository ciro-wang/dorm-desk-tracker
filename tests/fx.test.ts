import { describe, expect, it } from "vitest";
import { parseBankOfCanadaRate, toCadCents } from "@/lib/fx";

describe("parseBankOfCanadaRate", () => {
  it("reads the latest USD→CAD observation", () => {
    expect(parseBankOfCanadaRate({ observations: [{ d: "2026-11-03", FXUSDCAD: { v: "1.3912" } }] })).toBe(1.3912);
  });

  it("rejects missing or implausible rates", () => {
    expect(parseBankOfCanadaRate({ observations: [] })).toBeNull();
    expect(parseBankOfCanadaRate({ observations: [{ FXUSDCAD: { v: "13.9" } }] })).toBeNull();
    expect(parseBankOfCanadaRate("nope")).toBeNull();
  });
});

describe("toCadCents", () => {
  it("converts and rounds to the cent", () => {
    expect(toCadCents(35999, 1.3912)).toBe(50082);
  });
});
