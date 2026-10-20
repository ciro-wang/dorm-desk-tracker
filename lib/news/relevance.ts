import type { NewsItemInput, Product } from "@/lib/types";

const CATEGORY_WORDS: Record<string, "monitor" | "speaker"> = {
  monitor: "monitor",
  oled: "monitor",
  speaker: "speaker",
  bookshelf: "speaker",
};
const MERCHANTS = ["best buy", "canada computers", "dell", "amazon", "memory express", "newegg", "fluance", "crutchfield", "visions", "bay bloor"];
const TORONTO = ["toronto", "gta", "in-store", "in store", "ontario"];

const squash = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, "");

/** Model-number tokens from a product name: words that mix letters and digits, e.g. "M27X", "R-55PX". */
export function modelTokens(p: Pick<Product, "name">): string[] {
  return p.name
    .split(/\s+/)
    .map(squash)
    .filter((t) => /[a-z]/.test(t) && /\d/.test(t) && t.length >= 3);
}

export function scoreNewsItem(item: NewsItemInput, products: Product[]): { score: number; matchedProductIds: string[]; tags: string[] } {
  const text = `${item.title} ${item.excerpt}`.toLowerCase();
  const flat = squash(text);

  const matched = products.filter((p) => modelTokens(p).some((t) => flat.includes(t)));
  const categoryHit = Object.entries(CATEGORY_WORDS).find(([w]) => text.includes(w));
  const merchantHit = MERCHANTS.some((m) => new RegExp(`\\b${m}\\b`).test(text));
  const torontoHit = TORONTO.some((w) => text.includes(w));

  let score = 0;
  if (matched.length) score += 10;
  if (categoryHit) score += 3;
  if (merchantHit) score += 2;
  if (torontoHit) score += 2;

  const tags: string[] = [];
  if (matched.length) tags.push("product");
  for (const c of ["monitor", "speaker"] as const) {
    if (matched.some((p) => p.category === c) || categoryHit?.[1] === c) tags.push(c);
  }
  if (torontoHit) tags.push("toronto");
  return { score, matchedProductIds: matched.map((p) => p.id), tags };
}
