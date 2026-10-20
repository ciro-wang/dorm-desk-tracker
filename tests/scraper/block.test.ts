import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { detectBlock } from "@/lib/scraper/block";

const fx = (f: string) => readFileSync(path.resolve(__dirname, "../fixtures/generic", f), "utf8");

describe("detectBlock", () => {
  it("treats rate-limit and forbidden statuses as blocked", () => {
    for (const s of [403, 429, 503]) expect(detectBlock(s, "<html></html>")).toBe(true);
  });

  it("treats a captcha page with price-like text as blocked", () => {
    expect(detectBlock(200, fx("robot-check.html"))).toBe(true);
    expect(detectBlock(200, "<div id='px-captcha'></div>")).toBe(true);
    expect(detectBlock(200, "<h1>Access Denied</h1>")).toBe(true);
  });

  it("does not flag a normal page that embeds a reCAPTCHA widget", () => {
    const html = `<html><head><script src="https://www.google.com/recaptcha/api.js"></script></head><body><div class="g-recaptcha"></div>${fx("product-cad.html")}</body></html>`;
    expect(detectBlock(200, html)).toBe(false);
  });

  it("flags common bot-wall challenge pages", () => {
    expect(detectBlock(200, "<script src='https://geo.captcha-delivery.com/captcha/'></script>")).toBe(true);
    expect(detectBlock(200, "<form action='/cdn-cgi/challenge-platform/h/b/orchestrate'>")).toBe(true);
    expect(detectBlock(200, "<p>Please verify you are human</p>")).toBe(true);
  });

  it("does not flag a normal product page", () => {
    expect(detectBlock(200, fx("product-cad.html"))).toBe(false);
  });
});
