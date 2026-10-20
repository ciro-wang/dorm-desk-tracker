import * as cheerio from "cheerio";

/** Feed and page content is shown as plain text only, never as HTML. */
export function toPlainText(html: string, maxLen = 500): string {
  const $ = cheerio.load(`<div id="root">${html}</div>`);
  $("script, style, noscript, iframe").remove();
  const text = $("#root").text().replace(/\s+/g, " ").trim();
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}
