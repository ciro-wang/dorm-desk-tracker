import example from "@/seed.example.json";

/*
 * Made-up data for the public demo. Products and stores come from seed.example.json; everything
 * else (targets, listings, prices, deal posts) is invented here. All links point at example.com.
 * Rows use the database's snake_case shape so the real loaders and mappers run unchanged.
 */

type Row = Record<string, unknown>;
export type DemoTables = Record<string, Row[]>;

const DAY = 86_400_000;
const HISTORY_DAYS = 90;

const uuid = (group: number, n: number) => `00000000-0000-4000-8000-${String(group).padStart(4, "0")}${String(n).padStart(8, "0")}`;
const torontoDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(d);
const cents = (dollars: number) => Math.round(dollars * 100);
const endIn99 = (c: number) => Math.floor(c / 100) * 100 - 1;

/** Extra made-up products so each tab has something to show. */
const EXTRA_PRODUCTS = [
  {
    slug: "example-qhd-monitor",
    name: "Example 27\" QHD IPS Monitor",
    category: "monitor",
    msrp: 450,
    specs: { kind: "monitor", sizeIn: 27, resW: 2560, resH: 1440, refreshHz: 180, panel: "IPS", panelHeightCm: 36, usbcPdW: 65, curve: null },
  },
  { slug: "example-desk-chair", name: "Example Mesh Desk Chair", category: "chair", msrp: 400, specs: { kind: "chair", variant: "Mesh, black" } },
];

/**
 * Each listing's price story, as a fraction of MSRP: `usual` most of the time, `now` over the last
 * `saleDays` days. `was` is the store's "was" price on the latest check.
 */
const LISTINGS: { product: string; merchant: string; usual: number; now: number; saleDays: number; was?: number; manual?: boolean; pickup?: boolean }[] = [
  { product: "example-monitor", merchant: "canada-computers", usual: 0.97, now: 0.74, saleDays: 3, was: 1.0, pickup: true },
  { product: "example-monitor", merchant: "best-buy", usual: 0.99, now: 0.79, saleDays: 3, was: 1.0 },
  { product: "example-monitor", merchant: "amazon", usual: 1.0, now: 0.82, saleDays: 2, manual: true },
  { product: "example-qhd-monitor", merchant: "best-buy", usual: 0.9, now: 0.89, saleDays: 4, was: 1.3 },
  { product: "example-qhd-monitor", merchant: "canada-computers", usual: 0.92, now: 0.92, saleDays: 0, pickup: true },
  { product: "example-speaker", merchant: "best-buy", usual: 1.0, now: 0.86, saleDays: 5, was: 1.0 },
  { product: "example-speaker", merchant: "crutchfield", usual: 1.0, now: 0.9, saleDays: 3, manual: true },
  { product: "example-desk-chair", merchant: "sihoo-ca", usual: 0.95, now: 0.8, saleDays: 3, was: 1.0 },
];

const NEWS = [
  { source: "rfd", title: "[Canada Computers] Example 32\" OLED monitor down to its lowest price yet", product: "example-monitor", hoursAgo: 3, score: 9, tags: ["product", "monitor", "toronto"] },
  { source: "reddit", title: "Best Buy Black Friday monitor roundup: OLED and high-refresh IPS", product: null, hoursAgo: 6, score: 6, tags: ["monitor"] },
  { source: "rfd", title: "[Best Buy] Example bookshelf speakers 14% off for Black Friday", product: "example-speaker", hoursAgo: 9, score: 7, tags: ["product", "speaker"] },
  { source: "reddit", title: "PSA: compare \"was\" prices against price history before you buy", product: null, hoursAgo: 14, score: 4, tags: [] },
  { source: "rfd", title: "[Sihoo] Sitewide desk chair sale, free shipping in Canada", product: "example-desk-chair", hoursAgo: 20, score: 5, tags: ["product", "chair"] },
  { source: "rfd", title: "[Memory Express] Open-box monitor clearance at the Toronto store", product: null, hoursAgo: 30, score: 3, tags: ["monitor", "toronto"] },
] as const;

/** Small, repeatable wobble so the history isn't a flat line. */
const wobble = (i: number, daysAgo: number) => 0.02 * Math.sin(daysAgo / 4 + i * 1.7) + 0.01 * Math.sin(daysAgo / 11 + i);

export function buildDemoTables(now: Date): DemoTables {
  const merchants = example.merchants.map((m, i) => ({ id: uuid(1, i), slug: m.slug, name: m.name }));
  const merchantId = new Map(merchants.map((m) => [m.slug, m.id]));

  const products = [...example.products, ...EXTRA_PRODUCTS].map((p, i) => ({
    id: uuid(2, i),
    slug: p.slug,
    name: p.name,
    category: p.category,
    msrp_cents: cents(p.msrp),
    target_high_cents: endIn99(cents(p.msrp * 0.85)),
    target_low_cents: endIn99(cents(p.msrp * 0.75)),
    colour_prefs: [],
    specs: p.specs,
    active: true,
    alerts_enabled: true,
    reference_low_cents: null,
  }));
  const product = new Map(products.map((p) => [p.slug, p]));

  const pickupStore = { id: uuid(3, 0), merchant_id: merchantId.get("canada-computers"), external_store_id: "demo-downtown", name: "Downtown (demo)" };

  const listings: Row[] = [];
  const priceLogs: Row[] = [];
  LISTINGS.forEach((l, i) => {
    const p = product.get(l.product)!;
    const id = uuid(4, i);
    listings.push({
      id,
      product_id: p.id,
      merchant_id: merchantId.get(l.merchant),
      url: `https://example.com/${l.merchant}/${l.product}`,
      is_bundle: false,
      bundle_contents: null,
      auto_check: !l.manual,
      trusted_seller: false,
      currency: "CAD",
    });
    // Automatic checks run daily in this demo; manual entries are weekly.
    for (let daysAgo = HISTORY_DAYS; daysAgo >= 0; daysAgo--) {
      if (l.manual && daysAgo % 7 !== 0) continue;
      const latest = daysAgo === 0;
      const at = latest ? new Date(now.getTime() - (20 + i * 9) * 60_000) : new Date(now.getTime() - daysAgo * DAY);
      // Usual price with a wobble, an early-sale step the week before, then the sale itself.
      const share =
        daysAgo < l.saleDays ? l.now : l.saleDays && daysAgo < l.saleDays + 7 ? l.usual - (l.usual - l.now) * 0.4 : l.usual + wobble(i, daysAgo);
      priceLogs.push({
        id: uuid(5, i * 1000 + daysAgo),
        listing_id: id,
        checked_at: at.toISOString(),
        source: l.manual ? "manual" : "scraped",
        status: "ok",
        price_cents: endIn99(Math.round(p.msrp_cents * share)),
        was_price_cents: latest && l.was ? endIn99(Math.round(p.msrp_cents * l.was)) : null,
        shipping_cents: 0,
        in_stock_online: true,
        pickup: latest && l.pickup ? [{ externalStoreId: pickupStore.external_store_id, storeName: pickupStore.name, inStock: true }] : [],
        condition: "new",
        seller: "retailer",
        colour: null,
        error: null,
        native_price_cents: null,
        native_currency: null,
      });
    }
  });

  const chair = product.get("example-desk-chair")!;
  const purchases = [
    {
      id: uuid(6, 0),
      product_id: chair.id,
      merchant_id: merchantId.get("sihoo-ca"),
      paid_cents: endIn99(Math.round(chair.msrp_cents * 0.88)),
      paid_total_cents: null,
      purchased_on: torontoDay(new Date(now.getTime() - 12 * DAY)),
      claim_by: torontoDay(new Date(now.getTime() + 18 * DAY)),
      claim_note: "Price protection for 30 days (demo)",
      last_alerted_cents: null,
    },
  ];

  const news = NEWS.map((n, i) => ({
    id: uuid(7, i),
    source: n.source,
    source_id: `demo-${i}`,
    title: n.title,
    url: `https://example.com/deals/${i + 1}`,
    published_at: new Date(now.getTime() - n.hoursAgo * 3600_000).toISOString(),
    excerpt: "Made-up post for the demo.",
    score: n.score,
    matched_product_ids: n.product ? [product.get(n.product)!.id] : [],
    tags: [...n.tags],
  }));

  return { merchants, products, listings, pickup_stores: [pickupStore], price_logs: priceLogs, purchases, news_items: news, ...historyViews(listings, priceLogs) };
}

/** In-memory versions of the views in supabase/migrations (latest log per listing, daily best prices). */
function historyViews(listings: Row[], logs: Row[]): DemoTables {
  const newestFirst = [...logs].sort((a, b) => String(b.checked_at).localeCompare(String(a.checked_at)));
  const firstPer = (rows: Row[]) => {
    const out = new Map<unknown, Row>();
    for (const r of rows) if (!out.has(r.listing_id)) out.set(r.listing_id, r);
    return [...out.values()];
  };
  const listingById = new Map(listings.map((l) => [l.id, l]));

  const dailyBest = new Map<string, Row>();
  for (const log of logs) {
    const l = listingById.get(log.listing_id)!;
    if (log.status !== "ok" || log.condition !== "new" || log.price_cents == null || l.is_bundle) continue;
    if (log.seller !== "retailer" && !l.trusted_seller) continue;
    const day = torontoDay(new Date(log.checked_at as string));
    const total = (log.price_cents as number) + ((log.shipping_cents as number | null) ?? 0);
    const key = `${l.id}|${day}`;
    const prev = dailyBest.get(key);
    if (!prev || total < (prev.cents as number)) dailyBest.set(key, { listing_id: l.id, product_id: l.product_id, merchant_id: l.merchant_id, day, cents: total });
  }
  const productBest = new Map<string, Row>();
  for (const r of dailyBest.values()) {
    const key = `${r.product_id}|${r.day}`;
    const prev = productBest.get(key);
    if (!prev || (r.cents as number) < (prev.cents as number)) productBest.set(key, { product_id: r.product_id, day: r.day, cents: r.cents });
  }

  return {
    latest_price_logs: firstPer(newestFirst),
    latest_ok_price_logs: firstPer(newestFirst.filter((r) => r.status === "ok")),
    listing_daily_best: [...dailyBest.values()],
    product_daily_best: [...productBest.values()],
  };
}
