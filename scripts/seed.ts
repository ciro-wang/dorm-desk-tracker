/**
 * Upserts merchants, pickup stores, products and listings from seed.local.json
 * (git-ignored, personal) or, with --example, from seed.example.json.
 * Prints counts only.
 *
 *   npx tsx --env-file=.env.local scripts/seed.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createServiceClient } from "@/lib/db/server";
import { describeError } from "@/lib/describe-error";
import { parseSeed } from "@/lib/seed/schema";
import { toCents } from "@/lib/money";

async function main() {
  const file = process.argv.includes("--example") ? "seed.example.json" : "seed.local.json";
  const seed = parseSeed(JSON.parse(readFileSync(path.resolve(process.cwd(), file), "utf8")));
  const db = createServiceClient();

  const { data: merchants, error: mErr } = await db
    .from("merchants")
    .upsert(seed.merchants, { onConflict: "slug" })
    .select("id, slug");
  if (mErr) throw mErr;
  const merchantId = new Map(merchants.map((m) => [m.slug, m.id as string]));

  if (seed.pickupStores.length) {
    const { error } = await db.from("pickup_stores").upsert(
      seed.pickupStores.map((s) => ({
        merchant_id: merchantId.get(s.merchantSlug),
        external_store_id: s.externalStoreId,
        name: s.name,
      })),
      { onConflict: "merchant_id,external_store_id" },
    );
    if (error) throw error;
  }

  const { data: products, error: pErr } = await db
    .from("products")
    .upsert(
      seed.products.map((p) => ({
        slug: p.slug,
        name: p.name,
        category: p.category,
        msrp_cents: toCents(p.msrp),
        target_high_cents: toCents(p.targetHigh),
        target_low_cents: toCents(p.targetLow),
        reference_low_cents: p.referenceLow == null ? null : toCents(p.referenceLow),
        colour_prefs: p.colourPrefs,
        specs: p.specs,
        active: p.active,
        alerts_enabled: p.alertsEnabled,
      })),
      { onConflict: "slug" },
    )
    .select("id, slug");
  if (pErr) throw pErr;
  const productId = new Map(products.map((p) => [p.slug, p.id as string]));

  if (seed.listings.length) {
    const { error } = await db.from("listings").upsert(
      seed.listings.map((l) => ({
        product_id: productId.get(l.productSlug),
        merchant_id: merchantId.get(l.merchantSlug),
        url: l.url,
        is_bundle: l.isBundle,
        bundle_contents: l.bundleContents,
        auto_check: l.autoCheck,
        trusted_seller: l.trustedSeller,
      })),
      { onConflict: "product_id,url" },
    );
    if (error) throw error;
  }

  console.log(
    `merchants: ${seed.merchants.length}, pickupStores: ${seed.pickupStores.length}, products: ${seed.products.length}, listings: ${seed.listings.length}`,
  );
}

main().catch((e) => {
  console.error("seed failed:", describeError(e));
  process.exit(1);
});
