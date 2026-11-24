import { describe, expect, it } from "vitest";
import { demoMode, demoRoute } from "@/lib/demo/mode";

describe("demoMode", () => {
  it("is off unless DEMO_MODE is exactly 1", () => {
    expect(demoMode({})).toBe(false);
    expect(demoMode({ DEMO_MODE: "0" })).toBe(false);
    expect(demoMode({ DEMO_MODE: "true" })).toBe(false);
    expect(demoMode({ DEMO_MODE: "1" })).toBe(true);
  });

  it("refuses to run next to real secrets or a real database", () => {
    for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NTFY_TOPIC_URL", "CRON_TOKEN"]) {
      expect(() => demoMode({ DEMO_MODE: "1", [key]: "x" }), key).toThrow(key);
    }
  });

  it("ignores those variables when demo mode is off", () => {
    expect(demoMode({ SUPABASE_SERVICE_ROLE_KEY: "x", CRON_TOKEN: "y" })).toBe(false);
  });
});

describe("demoRoute", () => {
  it("serves the read-only pages", () => {
    for (const p of ["/", "/news", "/product/example-monitor"]) {
      expect(demoRoute("GET", p), p).toEqual({ action: "allow" });
    }
    expect(demoRoute("HEAD", "/")).toEqual({ action: "allow" });
  });

  it("hides every API route, including the cron jobs", () => {
    for (const p of ["/api/cron/check-prices", "/api/cron/fetch-news", "/api/anything", "/api"]) {
      expect(demoRoute("GET", p), p).toEqual({ action: "not_found" });
      expect(demoRoute("POST", p), p).toEqual({ action: "not_found" });
    }
  });

  it("rejects every write, which also blocks server actions", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(demoRoute(m, "/"), m).toEqual({ action: "method_not_allowed" });
      expect(demoRoute(m, "/product/example-monitor"), m).toEqual({ action: "method_not_allowed" });
    }
  });

  it("sends login and settings back to the dashboard", () => {
    for (const p of ["/login", "/settings", "/settings/anything"]) {
      expect(demoRoute("GET", p), p).toEqual({ action: "redirect", to: "/" });
    }
  });
});
