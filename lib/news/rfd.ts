import { parseFeed } from "@/lib/news/atom";
import { detectBlock } from "@/lib/scraper/block";
import { fetchHtml } from "@/lib/scraper/http";
import type { NewsItemInput } from "@/lib/types";

/** RedFlagDeals "Hot Deals" forum (id 9), Atom feed. Verified 2026-10-20. */
export const RFD_HOT_DEALS_FEED = "https://forums.redflagdeals.com/feed/forum/9";

export async function fetchRfdHotDeals(): Promise<NewsItemInput[]> {
  const { status, html } = await fetchHtml(RFD_HOT_DEALS_FEED);
  if (status >= 400 || detectBlock(status, html)) throw new Error(`rfd feed unavailable: ${status}`);
  return parseFeed(html, "rfd");
}
