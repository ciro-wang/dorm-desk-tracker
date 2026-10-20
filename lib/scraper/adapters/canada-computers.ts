import * as cheerio from "cheerio";
import { resultFromHtml } from "@/lib/scraper/adapters/generic";
import { fetchHtml } from "@/lib/scraper/http";
import type { MerchantAdapter } from "@/lib/scraper/types";
import type { PickupStock } from "@/lib/types";

/**
 * Canada Computers' public store list (name → id), captured 2026-10-20. The row for the
 * visitor's "preferred store" (picked by their location) has no data-whid, so its id comes from here.
 */
export const CC_STORE_IDS: Record<string, string> = {
  Ajax: "AJ", Barrie: "BA", Brampton: "BR", Brossard: "BS", Burlington: "BL", Burnaby: "BN", Calgary: "MA",
  Cambridge: "CA", Coquitlam: "CQ", "Edmonton Northgate": "NG", "Edmonton South Park": "SP", Etobicoke: "EB",
  Gatineau: "GT", Halifax: "HL", Hamilton: "HM", Kanata: "KT", Kingston: "KI", Laval: "LA", London: "LN",
  "Marche Central": "MC", Markham: "MU", Mississauga: "MI", Montreal: "MO", Nepean: "OM", Newmarket: "NM",
  "North York Centerpoint Mall": "NO", "North York Lawrence": "LP", Oakville: "OA", Orleans: "OO", Oshawa: "OW",
  Ottawa: "OD", "Quebec City": "QV", "Richmond Hill": "RH", Richmond: "RM", Scarborough: "TK",
  "St Catharines": "SC", Surrey: "SU", "Toronto Downtown": "TD", Vancouver: "VC", Vaughan: "VA", Waterloo: "WA",
  Whitby: "WH",
};

/**
 * Canada Computers renders every store's stock into the "Check Other Stores" modal
 * (#checkothertores) of the product page: a name span, a quantity span
 * (.shop-online-box) and a button whose data-whid is the store id (e.g. "MI" = Mississauga).
 */
export function parseCanadaComputersStock(html: string): PickupStock[] {
  const $ = cheerio.load(html);
  const stock: PickupStock[] = [];
  $("#checkothertores .shop-online-box").each((_, el) => {
    const row = $(el).parent();
    const storeName = row.find("span").first().text().trim();
    if (!storeName || storeName.toLowerCase() === "online") return;
    const qty = parseInt($(el).text().replace(/[^0-9]/g, ""), 10);
    const id = row.find("[data-whid]").attr("data-whid") ?? CC_STORE_IDS[storeName] ?? `name:${storeName.toLowerCase().replace(/\s+/g, "-")}`;
    stock.push({ externalStoreId: id, storeName, inStock: Number.isFinite(qty) && qty > 0 });
  });
  return stock;
}

export const canadaComputersAdapter: MerchantAdapter = {
  merchantSlug: "canada-computers",
  needsBrowser: false,
  async scrape(url, ctx) {
    const { status, html } = await fetchHtml(url);
    const result = resultFromHtml(status, html, ctx);
    if (result.status !== "ok") return result;
    const title = cheerio.load(html)("title").text().toLowerCase();
    return {
      ...result,
      condition: title.includes("open box") ? "open_box" : title.includes("refurbished") ? "refurbished" : result.condition,
      pickup: parseCanadaComputersStock(html),
    };
  },
};
