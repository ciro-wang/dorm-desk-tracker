import { describe, expect, it, vi } from "vitest";
import { runCheckPrices } from "@/lib/jobs/check-prices";
import type { MerchantAdapter } from "@/lib/scraper/types";
import { emptyResult } from "@/lib/scraper/types";
import type { Merchant } from "@/lib/types";
import { FakeRepo } from "../helpers/fake-repo";
import { listing, monitor } from "../helpers/factories";

const cc: Merchant = { id: "m-cc", slug: "canada-computers", name: "Canada Computers" };
const bb: Merchant = { id: "m-bb", slug: "best-buy", name: "Best Buy" };
const mon = monitor();
const CC_URL = "https://www.canadacomputers.com/en/x/1/y.html";
const BB_URL = "https://www.bestbuy.ca/en-ca/product/x/12345678";
const outOfWindow = new Date("2026-11-10T15:00:00Z");
const inWindow = new Date("2026-11-21T15:00:00Z");

function adapterReturning(map: Record<string, () => Promise<ReturnType<typeof emptyResult>>>) {
  return (slug: string): MerchantAdapter => ({ merchantSlug: slug, needsBrowser: false, scrape: () => map[slug]() });
}

function setup(results: Record<string, () => Promise<ReturnType<typeof emptyResult>>>) {
  const repo = new FakeRepo([mon], [cc, bb], [
    listing({ productId: mon.id, merchantId: cc.id, url: CC_URL }),
    listing({ productId: mon.id, merchantId: bb.id, url: BB_URL }),
  ]);
  const notify = { send: vi.fn().mockResolvedValue(undefined) };
  return { repo, notify, getAdapter: adapterReturning(results) };
}

const ok = (cents: number) => async () => ({ ...emptyResult("ok"), priceCents: cents });

describe("runCheckPrices", () => {
  it("passes each store only its own pickup store ids", async () => {
    const seen: Record<string, string[]> = {};
    const repo = new FakeRepo([mon], [cc, bb], [listing({ productId: mon.id, merchantId: cc.id, url: CC_URL }), listing({ productId: mon.id, merchantId: bb.id, url: BB_URL })], [
      { id: "s1", merchantId: cc.id, externalStoreId: "S1", name: "Store One" },
    ]);
    const getAdapter = (slug: string): MerchantAdapter => ({
      merchantSlug: slug,
      needsBrowser: false,
      scrape: async (_url, ctx) => {
        seen[slug] = ctx.pickupStoreIds;
        return { ...emptyResult("ok"), priceCents: 125000 };
      },
    });
    await runCheckPrices({ repo, getAdapter, notify: { send: vi.fn() }, now: () => outOfWindow, appBaseUrl: "https://app" });
    expect(seen).toEqual({ "canada-computers": ["S1"], "best-buy": [] });
  });

  it("logs every listing and keeps going when an adapter throws", async () => {
    const { repo, notify, getAdapter } = setup({
      "canada-computers": ok(125000),
      "best-buy": async () => {
        throw new Error("boom");
      },
    });
    const counts = await runCheckPrices({ repo, getAdapter, notify, now: () => outOfWindow, appBaseUrl: "https://app" });
    expect(counts).toEqual({ checked: 2, ok: 1, blocked: 0, failed: 1, alerts: 0 });
    expect(repo.logs).toHaveLength(2);
    expect(repo.logs.find((l) => l.status === "failed")?.error).toBe("adapter_error");
    expect(repo.jobRuns).toHaveLength(1);
  });

  it("rejects an implausible price and sends no alert", async () => {
    const { repo, notify, getAdapter } = setup({ "canada-computers": ok(999), "best-buy": async () => emptyResult("blocked") });
    const counts = await runCheckPrices({ repo, getAdapter, notify, now: () => outOfWindow, appBaseUrl: "https://app" });
    expect(repo.logs.find((l) => l.priceCents === 999)).toMatchObject({ status: "failed", error: "implausible" });
    expect(counts).toMatchObject({ ok: 0, blocked: 1, failed: 1, alerts: 0 });
    expect(notify.send).not.toHaveBeenCalled();
  });

  it("sends one alert when the best price crosses target", async () => {
    const { repo, notify, getAdapter } = setup({ "canada-computers": ok(106000), "best-buy": ok(109000) });
    const counts = await runCheckPrices({ repo, getAdapter, notify, now: () => outOfWindow, appBaseUrl: "https://app" });
    expect(counts.alerts).toBe(1);
    expect(notify.send).toHaveBeenCalledTimes(1);
    expect(notify.send.mock.calls[0][0].title).toContain("Example OLED Monitor M27X");
    expect(notify.send.mock.calls[0][0].message).toContain("at Canada Computers");
    expect(repo.alertLog).toEqual([{ productId: mon.id, kind: "below_target", cents: 106000 }]);
    await runCheckPrices({ repo, getAdapter, notify, now: () => new Date(outOfWindow.getTime() + 1800_000), appBaseUrl: "https://app" });
    expect(notify.send).toHaveBeenCalledTimes(1);
  });

  it("does not mark an alert as sent when delivery fails", async () => {
    const { repo, getAdapter } = setup({ "canada-computers": ok(106000), "best-buy": ok(109000) });
    const notify = { send: vi.fn().mockRejectedValue(new Error("down")) };
    const counts = await runCheckPrices({ repo, getAdapter, notify, now: () => outOfWindow, appBaseUrl: "https://app" });
    expect(counts.alerts).toBe(0);
    expect(repo.alertStates.get(mon.id)).toBeUndefined();
  });

  it("sends one pickup alert even when the pickup store's checks come and go", async () => {
    const ccListing = listing({ productId: mon.id, merchantId: cc.id, url: CC_URL });
    const bbListing = listing({ productId: mon.id, merchantId: bb.id, url: BB_URL });
    const repo = new FakeRepo([mon], [cc, bb], [ccListing, bbListing], [{ id: "s1", merchantId: cc.id, externalStoreId: "S1", name: "Store One" }]);
    const notify = { send: vi.fn().mockResolvedValue(undefined) };
    const ccResults = [true, false, true, false, true];
    let run = 0;
    const getAdapter = (slug: string): MerchantAdapter => ({
      merchantSlug: slug,
      needsBrowser: false,
      scrape: async () =>
        slug === "best-buy"
          ? { ...emptyResult("ok"), priceCents: 109500 }
          : ccResults[run]
            ? { ...emptyResult("ok"), priceCents: 108900, pickup: [{ externalStoreId: "S1", storeName: "Store One", inStock: true }] }
            : emptyResult("blocked"),
    });
    for (run = 0; run < ccResults.length; run++) {
      await runCheckPrices({ repo, getAdapter, notify, now: () => new Date(outOfWindow.getTime() + run * 1800_000), appBaseUrl: "https://app" });
    }
    const kinds = notify.send.mock.calls.map((c) => c[0].message);
    expect(kinds.filter((m: string) => m.includes("now in stock downtown"))).toHaveLength(1);
  });

  it("alerts about downtown pickup on a slightly pricier listing that is still under target", async () => {
    const repo = new FakeRepo([mon], [cc, bb], [listing({ productId: mon.id, merchantId: cc.id, url: CC_URL }), listing({ productId: mon.id, merchantId: bb.id, url: BB_URL })], [
      { id: "s1", merchantId: cc.id, externalStoreId: "S1", name: "Store One" },
    ]);
    const notify = { send: vi.fn().mockResolvedValue(undefined) };
    const getAdapter = (slug: string): MerchantAdapter => ({
      merchantSlug: slug,
      needsBrowser: false,
      scrape: async () =>
        slug === "best-buy"
          ? { ...emptyResult("ok"), priceCents: 104000 }
          : { ...emptyResult("ok"), priceCents: 108000, pickup: [{ externalStoreId: "S1", storeName: "Store One", inStock: true }] },
    });
    await runCheckPrices({ repo, getAdapter, notify, now: () => outOfWindow, appBaseUrl: "https://app" });
    const messages = notify.send.mock.calls.map((c) => c[0].message as string);
    expect(messages).toContain("$1,080.00 at Canada Computers · now in stock downtown");
  });

  it("still alerts on a fresh manual price when the store blocks the automatic check", async () => {
    const { repo, notify, getAdapter } = setup({ "canada-computers": async () => emptyResult("blocked"), "best-buy": async () => emptyResult("blocked") });
    await repo.insertPriceLog({ ...emptyResult("ok"), priceCents: 104900, listingId: repo.listings[1].id, checkedAt: new Date(outOfWindow.getTime() - 600_000).toISOString(), source: "manual" });
    const counts = await runCheckPrices({ repo, getAdapter, notify, now: () => outOfWindow, appBaseUrl: "https://app" });
    expect(counts.alerts).toBe(1);
    expect(notify.send.mock.calls[0][0].message).toContain("$1,049.00 at Best Buy");
  });

  it("never fetches a listing url that isn't on the store's own https domain", async () => {
    const scrape = vi.fn();
    const repo = new FakeRepo([mon], [cc], [listing({ productId: mon.id, merchantId: cc.id, url: "http://169.254.169.254/latest/meta-data" })]);
    const counts = await runCheckPrices({
      repo,
      getAdapter: (slug) => ({ merchantSlug: slug, needsBrowser: false, scrape }),
      notify: { send: vi.fn() },
      now: () => outOfWindow,
      appBaseUrl: "https://app",
    });
    expect(scrape).not.toHaveBeenCalled();
    expect(counts).toMatchObject({ checked: 1, failed: 1 });
    expect(repo.logs[0]).toMatchObject({ status: "failed", error: "bad_url" });
  });

  it("announces a sale window once when it opens", async () => {
    const { repo, notify, getAdapter } = setup({ "canada-computers": ok(125000), "best-buy": ok(125000) });
    await runCheckPrices({ repo, getAdapter, notify, now: () => outOfWindow, appBaseUrl: "https://app" });
    expect(notify.send).not.toHaveBeenCalled();
    await runCheckPrices({ repo, getAdapter, notify, now: () => inWindow, appBaseUrl: "https://app" });
    expect(notify.send).toHaveBeenCalledTimes(1);
    expect(notify.send.mock.calls[0][0]).toMatchObject({
      title: "Sale window open",
      message: "Prices are being checked every 30 min. Please verify listings that can't be auto-checked (e.g. Amazon.ca, Newegg, Memory Express).",
      clickUrl: "https://app/",
    });
    await runCheckPrices({ repo, getAdapter, notify, now: () => new Date(inWindow.getTime() + 1800_000), appBaseUrl: "https://app" });
    expect(notify.send).toHaveBeenCalledTimes(1);
  });
});
