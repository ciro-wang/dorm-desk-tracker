import { describe, expect, it } from "vitest";
import { verifyCronToken } from "@/lib/auth/cron-token";

describe("verifyCronToken", () => {
  it("accepts only the exact bearer token", () => {
    expect(verifyCronToken("Bearer abc", "abc")).toBe(true);
    expect(verifyCronToken("Bearer abd", "abc")).toBe(false);
    expect(verifyCronToken("Bearer abcd", "abc")).toBe(false);
    expect(verifyCronToken("abc", "abc")).toBe(false);
  });

  it("rejects missing headers and an unset secret", () => {
    expect(verifyCronToken(null, "abc")).toBe(false);
    expect(verifyCronToken("Bearer ", "")).toBe(false);
    expect(verifyCronToken("Bearer x", undefined)).toBe(false);
  });
});
