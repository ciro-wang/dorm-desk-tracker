import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/scraper/http", () => ({ fetchHtml: vi.fn(), fetchRenderedHtml: vi.fn() }));
import { fetchHtml, fetchRenderedHtml } from "@/lib/scraper/http";
import { fetchRfdHotDeals } from "@/lib/news/rfd";
import { fetchSubreddit } from "@/lib/news/reddit";

const fx = (f: string) => readFileSync(path.resolve(__dirname, "../fixtures/news", f), "utf8");

describe("fetchRfdHotDeals", () => {
  beforeEach(() => vi.mocked(fetchHtml).mockReset());

  it("parses the Hot Deals Atom feed (captured 2026-10-20)", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 200, html: fx("rfd.xml") });
    const items = await fetchRfdHotDeals();
    expect(items).toHaveLength(4);
    expect(items[2]).toMatchObject({
      source: "rfd",
      title: "[London Drugs] Cooler Master Masterbox E300L PC case $19.88 YMMV",
    });
    expect(items[0].url.startsWith("https://forums.redflagdeals.com/")).toBe(true);
    expect(items[0].sourceId).toBeTruthy();
    expect(Number.isNaN(Date.parse(items[0].publishedAt))).toBe(false);
    expect(items[0].excerpt).not.toMatch(/<[a-z]/i);
  });

  it("throws when the feed is blocked", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 403, html: "Access Denied" });
    await expect(fetchRfdHotDeals()).rejects.toThrow();
  });
});

describe("fetchSubreddit", () => {
  beforeEach(() => {
    vi.mocked(fetchHtml).mockReset();
    vi.mocked(fetchRenderedHtml).mockReset();
  });

  it("parses the subreddit Atom feed (captured 2026-10-20)", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 200, html: fx("reddit.xml") });
    const items = await fetchSubreddit("bapcsalescanada");
    expect(items).toHaveLength(4);
    expect(items[3]).toMatchObject({ source: "reddit", title: "[CPU] IN-STORE ONLY - AMD Ryzen 7 9800X3D+Onimusha [$560][Canada Computers]" });
    expect(items[3].url.startsWith("https://www.reddit.com/r/bapcsalescanada/")).toBe(true);
    expect(fetchRenderedHtml).not.toHaveBeenCalled();
  });

  it("falls back to old.reddit in a browser when the feed is blocked", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 429, html: "Too Many Requests" });
    vi.mocked(fetchRenderedHtml).mockResolvedValueOnce({
      status: 200,
      html: `<div class="thing" data-fullname="t3_abc" data-permalink="/r/bapcsalescanada/comments/abc/x/" data-timestamp="1763650000000">
               <a class="title" href="https://www.canadacomputers.com/x">[Monitor] Example M27X $999</a></div>`,
    });
    const items = await fetchSubreddit("bapcsalescanada");
    expect(items).toEqual([
      {
        source: "reddit",
        sourceId: "t3_abc",
        title: "[Monitor] Example M27X $999",
        url: "https://www.reddit.com/r/bapcsalescanada/comments/abc/x/",
        publishedAt: new Date(1763650000000).toISOString(),
        excerpt: "",
      },
    ]);
  });
});
