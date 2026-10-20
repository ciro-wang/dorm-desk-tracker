import { describe, expect, it } from "vitest";
import { securityHeaders } from "@/next.config";

const value = (key: string) => securityHeaders.find((h) => h.key === key)?.value;

describe("security headers", () => {
  it("sets every required header", () => {
    const keys = securityHeaders.map((h) => h.key);
    for (const k of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("forbids framing", () => {
    expect(value("X-Frame-Options")).toBe("DENY");
    expect(value("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("does not leak referrers", () => {
    expect(value("Referrer-Policy")).toBe("no-referrer");
  });
});
