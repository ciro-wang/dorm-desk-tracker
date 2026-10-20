import type { AlertKind, AlertState } from "@/lib/alerts/decide";
import type { Listing, Merchant, NewsItem, PriceLog, Product } from "@/lib/types";

/* The one place where database snake_case meets domain camelCase. */

type Row = Record<string, unknown>;

export function productFromRow(r: Row): Product {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    category: r.category as Product["category"],
    msrpCents: r.msrp_cents as number,
    targetHighCents: r.target_high_cents as number,
    targetLowCents: r.target_low_cents as number,
    colourPrefs: (r.colour_prefs as string[]) ?? [],
    specs: r.specs as Product["specs"],
    active: r.active as boolean,
    alertsEnabled: r.alerts_enabled as boolean,
    referenceLowCents: (r.reference_low_cents as number | null) ?? null,
  };
}

export function merchantFromRow(r: Row): Merchant {
  return { id: r.id as string, slug: r.slug as string, name: r.name as string };
}

export function listingFromRow(r: Row): Listing {
  return {
    id: r.id as string,
    productId: r.product_id as string,
    merchantId: r.merchant_id as string,
    url: r.url as string,
    isBundle: r.is_bundle as boolean,
    bundleContents: (r.bundle_contents as string | null) ?? null,
    autoCheck: r.auto_check as boolean,
    trustedSeller: Boolean(r.trusted_seller),
  };
}

export function priceLogToRow(l: Omit<PriceLog, "id">): Row {
  return {
    listing_id: l.listingId,
    checked_at: l.checkedAt,
    source: l.source,
    status: l.status,
    price_cents: l.priceCents,
    was_price_cents: l.wasPriceCents,
    shipping_cents: l.shippingCents,
    in_stock_online: l.inStockOnline,
    pickup: l.pickup,
    condition: l.condition,
    seller: l.seller,
    colour: l.colour,
    error: l.error,
  };
}

export function priceLogFromRow(r: Row): PriceLog {
  return {
    id: r.id as string,
    listingId: r.listing_id as string,
    checkedAt: new Date(r.checked_at as string).toISOString().replace(".000Z", "Z"),
    source: r.source as PriceLog["source"],
    status: r.status as PriceLog["status"],
    priceCents: (r.price_cents as number | null) ?? null,
    wasPriceCents: (r.was_price_cents as number | null) ?? null,
    shippingCents: (r.shipping_cents as number | null) ?? null,
    inStockOnline: (r.in_stock_online as boolean | null) ?? null,
    pickup: (r.pickup as PriceLog["pickup"]) ?? [],
    condition: r.condition as PriceLog["condition"],
    seller: r.seller as PriceLog["seller"],
    colour: (r.colour as string | null) ?? null,
    error: (r.error as string | null) ?? null,
  };
}

export function alertStateToRow(s: AlertState): Row {
  return {
    product_id: s.productId,
    last_alerted_cents: s.lastAlertedCents,
    sent_kinds: s.sentKinds,
    pickup_nearby: s.pickupNearby,
    above_target_since: s.aboveTargetSince,
    pickup_gone_since: s.pickupGoneSince,
  };
}

export function alertStateFromRow(r: Row): AlertState {
  return {
    productId: r.product_id as string,
    lastAlertedCents: (r.last_alerted_cents as number | null) ?? null,
    sentKinds: (r.sent_kinds as AlertKind[]) ?? [],
    pickupNearby: Boolean(r.pickup_nearby),
    aboveTargetSince: (r.above_target_since as string | null) ?? null,
    pickupGoneSince: r.pickup_gone_since ? new Date(r.pickup_gone_since as string).toISOString() : null,
  };
}

export function newsItemToRow(n: Omit<NewsItem, "id">): Row {
  return {
    source: n.source,
    source_id: n.sourceId,
    title: n.title,
    url: n.url,
    published_at: n.publishedAt,
    excerpt: n.excerpt,
    score: n.score,
    matched_product_ids: n.matchedProductIds,
    tags: n.tags,
  };
}

export function newsItemFromRow(r: Row): NewsItem {
  return {
    id: r.id as string,
    source: r.source as NewsItem["source"],
    sourceId: r.source_id as string,
    title: r.title as string,
    url: r.url as string,
    publishedAt: r.published_at as string,
    excerpt: (r.excerpt as string) ?? "",
    score: (r.score as number) ?? 0,
    matchedProductIds: (r.matched_product_ids as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
  };
}

/** Rows from the *_daily_best views → points at local noon of each Toronto day. */
export function dailyRowsToPoints(rows: { day: string; cents: number }[]): { at: Date; cents: number }[] {
  return rows.map((r) => ({ at: new Date(`${r.day}T12:00:00-05:00`), cents: r.cents }));
}
