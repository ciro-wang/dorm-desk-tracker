/**
 * Saves a product page as a small test fixture. Inline scripts are removed
 * except JSON-LD and JSON data blocks, so fixtures stay small and inert.
 *
 *   npx tsx scripts/capture-fixture.ts <url> <out.html> [--browser]
 */
import { writeFileSync } from "node:fs";
import * as cheerio from "cheerio";
import { fetchHtml, fetchRenderedHtml } from "@/lib/scraper/http";

async function main() {
  const [url, out] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!url || !out) throw new Error("usage: capture-fixture <url> <out.html> [--browser]");
  const { status, html } = process.argv.includes("--browser") ? await fetchRenderedHtml(url) : await fetchHtml(url);
  const $ = cheerio.load(html);
  $("script").each((_, el) => {
    const type = $(el).attr("type") ?? "";
    if (!/ld\+json|application\/json/.test(type)) $(el).remove();
  });
  $("style, noscript, svg, iframe, link").remove();
  writeFileSync(out, `<!-- status: ${status} -->\n${$.html()}`);
  console.log(`saved ${out} (status ${status}, ${Math.round($.html().length / 1024)} KB)`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
