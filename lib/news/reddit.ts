import * as cheerio from "cheerio";
import { parseFeed } from "@/lib/news/atom";
import { toPlainText } from "@/lib/news/sanitize";
import { detectBlock } from "@/lib/scraper/block";
import { fetchHtml, fetchRenderedHtml } from "@/lib/scraper/http";
import type { NewsItemInput } from "@/lib/types";

/** Canadian deal subreddits watched by default. */
export const DEFAULT_SUBREDDITS = ["bapcsalescanada"];

function parseOldReddit(html: string): NewsItemInput[] {
  const $ = cheerio.load(html);
  return $(".thing[data-fullname]")
    .toArray()
    .flatMap((el) => {
      const t = $(el);
      const permalink = t.attr("data-permalink") ?? "";
      const title = toPlainText(t.find("a.title").first().text(), 300);
      const ts = Number(t.attr("data-timestamp"));
      if (!permalink.startsWith("/r/") || !title) return [];
      return [
        {
          source: "reddit" as const,
          sourceId: t.attr("data-fullname")!,
          title,
          url: `https://www.reddit.com${permalink}`,
          publishedAt: new Date(Number.isFinite(ts) ? ts : Date.now()).toISOString(),
          excerpt: "",
        },
      ];
    });
}

/** RSS first (one request); if Reddit blocks it, one browser visit to old.reddit. */
export async function fetchSubreddit(name: string): Promise<NewsItemInput[]> {
  const { status, html } = await fetchHtml(`https://www.reddit.com/r/${encodeURIComponent(name)}/new/.rss`);
  if (status < 400 && !detectBlock(status, html)) {
    const items = await parseFeed(html, "reddit").catch(() => []);
    if (items.length) return items;
  }
  const page = await fetchRenderedHtml(`https://old.reddit.com/r/${encodeURIComponent(name)}/new/`);
  if (detectBlock(page.status, page.html)) throw new Error(`reddit unavailable: ${page.status}`);
  return parseOldReddit(page.html);
}
