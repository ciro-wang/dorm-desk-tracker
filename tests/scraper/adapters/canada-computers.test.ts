import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/scraper/http", () => ({ fetchHtml: vi.fn(), fetchRenderedHtml: vi.fn() }));
import { fetchHtml } from "@/lib/scraper/http";
import { canadaComputersAdapter, parseCanadaComputersStock } from "@/lib/scraper/adapters/canada-computers";
import { getAdapter } from "@/lib/scraper/registry";

// Fixtures are ordinary, non-watchlist products captured 2026-10-20.
const fx = (f: string) => readFileSync(path.resolve(__dirname, "../../fixtures/canada-computers", f), "utf8");
const ctx = { pickupStoreIds: ["MI"], merchantName: "Canada Computers" };

describe("parseCanadaComputersStock", () => {
  it("reads per-store stock with store ids", () => {
    const stock = parseCanadaComputersStock(fx("monitor-new.html"));
    expect(stock).toContainEqual({ externalStoreId: "MI", storeName: "Mississauga", inStock: true });
    expect(parseCanadaComputersStock(fx("monitor-open-box.html"))).toContainEqual({ externalStoreId: "EB", storeName: "Etobicoke", inStock: false });
    expect(stock.some((s) => s.storeName.toLowerCase() === "online")).toBe(false);
  });

  it("gives every store a real id", () => {
    for (const f of ["monitor-new.html", "monitor-open-box.html"]) {
      const stock = parseCanadaComputersStock(fx(f));
      expect(stock.length).toBeGreaterThan(30);
      for (const s of stock) expect(s.externalStoreId, `${f}: ${s.storeName}`).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("gives the visitor's 'preferred store' row its real id (that row has no data-whid)", () => {
    const html = `<div id="checkothertores">
      <div class="row"><span class="col-3">Mississauga</span><span class="shop-online-box">3</span>
        <div class="col-lg-4 locpickered not-allowed"> Preferred Store</div></div>
      <div class="row"><span class="col-3">Etobicoke</span><span class="shop-online-box">0</span>
        <button data-whid="EB">Set Preferred Store</button></div></div>`;
    expect(parseCanadaComputersStock(html)).toEqual([
      { externalStoreId: "MI", storeName: "Mississauga", inStock: true },
      { externalStoreId: "EB", storeName: "Etobicoke", inStock: false },
    ]);
  });
});

describe("canadaComputersAdapter", () => {
  it("returns price and pickup stock for a new item", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 200, html: fx("monitor-new.html") });
    const r = await canadaComputersAdapter.scrape("https://www.canadacomputers.com/en/x/1/y.html", ctx);
    expect(r).toMatchObject({ status: "ok", priceCents: 27999, condition: "new", seller: "retailer" });
    expect(r.pickup.find((p) => p.externalStoreId === "MI")).toEqual({ externalStoreId: "MI", storeName: "Mississauga", inStock: true });
  });

  it("detects open-box listings (flagged in structured data, not the page title)", async () => {
    vi.mocked(fetchHtml).mockResolvedValueOnce({ status: 200, html: fx("monitor-open-box.html") });
    const r = await canadaComputersAdapter.scrape("https://www.canadacomputers.com/en/x/2/y.html", ctx);
    expect(r).toMatchObject({ status: "ok", priceCents: 18999, condition: "open_box" });
  });

  it("is registered for its merchant slug", () => {
    expect(getAdapter("canada-computers")).toBe(canadaComputersAdapter);
  });
});
