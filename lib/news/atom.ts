import Parser from "rss-parser";
import { toPlainText } from "@/lib/news/sanitize";
import type { NewsItemInput } from "@/lib/types";

const parser = new Parser();

export async function parseFeed(xml: string, source: NewsItemInput["source"]): Promise<NewsItemInput[]> {
  const feed = await parser.parseString(xml);
  return feed.items.flatMap((i) => {
    const url = i.link ?? "";
    const title = toPlainText(i.title ?? "", 300);
    if (!url.startsWith("https://") || !title) return [];
    return [
      {
        source,
        sourceId: i.id ?? i.guid ?? url,
        title,
        url,
        publishedAt: new Date(i.isoDate ?? i.pubDate ?? Date.now()).toISOString(),
        excerpt: toPlainText(i.content ?? i.contentSnippet ?? ""),
      },
    ];
  });
}
