import { describe, expect, it } from "vitest";
import { formatCad, toCents } from "@/lib/money";

describe("money", () => {
  it("formats cents as CAD", () => {
    expect(formatCad(123456)).toBe("$1,234.56");
    expect(formatCad(99999)).toBe("$999.99");
  });

  it("converts dollars to whole cents", () => {
    expect(toCents(1234.56)).toBe(123456);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });
});
