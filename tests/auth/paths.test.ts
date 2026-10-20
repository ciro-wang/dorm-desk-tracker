import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/lib/auth/paths";

describe("isPublicPath", () => {
  it("allows only login, token-protected cron routes and static assets", () => {
    for (const p of ["/login", "/api/cron/check-prices", "/api/cron/fetch-news", "/_next/static/chunk.js", "/favicon.ico", "/robots.txt"]) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });

  it("protects everything else", () => {
    for (const p of ["/", "/product/example-monitor", "/news", "/settings", "/loginx", "/login/../settings", "/api/cron/check-prices/../../settings", "/api/other"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});
