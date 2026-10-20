import * as cheerio from "cheerio";
import { toCents } from "@/lib/money";
import type { Condition } from "@/lib/types";

export interface JsonLdOffer {
  priceCents: number | null;
  currency: string | null;
  availability: "in_stock" | "out_of_stock" | null;
  condition: Condition;
  sellerName: string | null;
  /** An AggregateOffer summarising several sellers/conditions (its lowPrice may be a third party's). */
  multiOffer: boolean;
}

type Node = Record<string, unknown>;

const isType = (n: Node, t: string) => {
  const type = n["@type"];
  return type === t || (Array.isArray(type) && type.includes(t));
};

function flatten(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === "object") {
    const n = value as Node;
    return [n, ...(n["@graph"] ? flatten(n["@graph"]) : [])];
  }
  return [];
}

function parsePrice(v: unknown): number | null {
  if (typeof v === "number") return toCents(v);
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && v.trim() !== "" ? toCents(n) : null;
  }
  return null;
}

function parseCondition(v: unknown): Condition {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("refurbished")) return "refurbished";
  if (s.includes("used") || s.includes("damaged")) return "open_box";
  return "new";
}

function parseAvailability(v: unknown): JsonLdOffer["availability"] {
  const s = String(v ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("instock") || s.includes("limitedavailability") || s.includes("instoreonly")) return "in_stock";
  if (s.includes("outofstock") || s.includes("soldout") || s.includes("discontinued")) return "out_of_stock";
  return null;
}

export function extractJsonLdOffer(html: string): JsonLdOffer | null {
  const $ = cheerio.load(html);
  const nodes: Node[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      nodes.push(...flatten(JSON.parse($(el).text())));
    } catch {
      // ignore malformed blocks
    }
  });

  const product = nodes.find((n) => isType(n, "Product") && n.offers);
  if (!product) return null;
  const offer = flatten(product.offers)[0];
  if (!offer) return null;

  const seller = offer.seller as Node | undefined;
  return {
    priceCents: parsePrice(isType(offer, "AggregateOffer") ? offer.lowPrice : offer.price),
    currency: typeof offer.priceCurrency === "string" ? offer.priceCurrency.toUpperCase() : null,
    availability: parseAvailability(offer.availability),
    condition: parseCondition(offer.itemCondition),
    sellerName: typeof seller?.name === "string" ? seller.name : null,
    multiOffer: isType(offer, "AggregateOffer") && Number(offer.offerCount) !== 1,
  };
}
