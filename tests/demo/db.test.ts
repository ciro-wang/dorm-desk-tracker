import { describe, expect, it } from "vitest";
import example from "@/seed.example.json";
import { createDemoClient } from "@/lib/demo/db";

type Row = Record<string, unknown>;
const NOW = new Date("2026-11-27T15:00:00Z");
const db = createDemoClient(NOW);

async function rows(q: PromiseLike<{ data: Row[] | null; error: unknown }>) {
  const { data, error } = await q;
  expect(error).toBeNull();
  return data ?? [];
}

describe("demo client data", () => {
  it("uses only example products and merchants", async () => {
    const products = await rows(db.from("products").select("*").order("name").range(0, 999));
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) expect(p.slug as string).toMatch(/^example-/);
    for (const p of example.products) expect(products.map((r) => r.slug)).toContain(p.slug);

    const merchants = await rows(db.from("merchants").select("*").order("name").range(0, 999));
    expect(merchants.map((m) => m.slug).sort()).toEqual(example.merchants.map((m) => m.slug).sort());
  });

  it("links only to example.com, never to real listings or posts", async () => {
    const listings = await rows(db.from("listings").select("*").range(0, 999));
    const news = await rows(db.from("news_items").select("*").range(0, 999));
    expect(listings.length).toBeGreaterThan(0);
    for (const r of [...listings, ...news]) expect(new URL(r.url as string).hostname).toBe("example.com");
  });

  it("has recent checks and history, so pages show prices rather than stale states", async () => {
    const latest = await rows(db.from("latest_price_logs").select("*").range(0, 999));
    expect(latest.length).toBeGreaterThan(0);
    for (const l of latest) expect(NOW.getTime() - new Date(l.checked_at as string).getTime()).toBeLessThan(6 * 3600_000);

    const daily = await rows(db.from("product_daily_best").select("product_id, day, cents").gte("day", "2026-10-01").order("day").range(0, 999));
    expect(daily.length).toBeGreaterThan(30);
  });

  it("supports the filters the loaders use", async () => {
    const [first] = await rows(db.from("listings").select("*").range(0, 0));
    const one = await rows(db.from("price_logs").select("*").in("listing_id", [first.id as string]).range(0, 999));
    expect(one.length).toBeGreaterThan(0);
    expect(one.every((r) => r.listing_id === first.id)).toBe(true);

    const byProduct = await rows(db.from("listing_daily_best").select("*").eq("product_id", first.product_id as string).range(0, 999));
    expect(byProduct.every((r) => r.product_id === first.product_id)).toBe(true);

    const matched = await rows(db.from("news_items").select("*").neq("matched_product_ids", "{}").range(0, 999));
    expect(matched.every((r) => (r.matched_product_ids as string[]).length > 0)).toBe(true);
  });
});

describe("demo client is read-only", () => {
  it("throws on every kind of write", () => {
    const t = db.from("products");
    expect(() => t.insert({ slug: "x" })).toThrow(/read-only/);
    expect(() => t.update({ name: "x" })).toThrow(/read-only/);
    expect(() => t.upsert({ slug: "x" })).toThrow(/read-only/);
    expect(() => t.delete()).toThrow(/read-only/);
    expect(() => db.rpc("is_owner")).toThrow(/read-only/);
  });

  it("cannot sign in or out", () => {
    expect(() => db.auth.signInWithPassword({ email: "a@b.c", password: "x" })).toThrow(/read-only/);
    expect(() => db.auth.signOut()).toThrow(/read-only/);
  });
});
