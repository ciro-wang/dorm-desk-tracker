import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9-]+$/);
const money = z.number().positive().max(20000);

const monitorSpecs = z.object({
  kind: z.literal("monitor"),
  sizeIn: z.number().positive(),
  resW: z.number().int().positive(),
  resH: z.number().int().positive(),
  refreshHz: z.number().int().positive(),
  panel: z.string().min(1),
  panelHeightCm: z.number().positive(),
  usbcPdW: z.number().nonnegative().nullable(),
  curve: z.string().nullable(),
});

const speakerSpecs = z.object({
  kind: z.literal("speaker"),
  wooferIn: z.number().positive(),
  subOut: z.boolean().nullable(),
  dimensionsMm: z.object({ w: z.number(), h: z.number(), d: z.number() }).nullable(),
  inputs: z.array(z.string()),
});

const product = z
  .object({
    slug,
    name: z.string().min(1),
    category: z.enum(["monitor", "speaker"]),
    msrp: money,
    targetHigh: money,
    targetLow: money,
    referenceLow: money.optional(),
    colourPrefs: z.array(z.string()).default([]),
    specs: z.discriminatedUnion("kind", [monitorSpecs, speakerSpecs]),
    active: z.boolean().default(true),
    alertsEnabled: z.boolean().default(true),
  })
  .refine((p) => p.targetLow <= p.targetHigh, { message: "targetLow must be <= targetHigh" })
  .refine((p) => p.specs.kind === p.category, { message: "specs.kind must match category" });

const listing = z.object({
  productSlug: slug,
  merchantSlug: slug,
  url: z.url({ protocol: /^https$/ }),
  isBundle: z.boolean().default(false),
  bundleContents: z.string().nullable().default(null),
  autoCheck: z.boolean().default(true),
  trustedSeller: z.boolean().default(false),
});

export const SeedFile = z
  .object({
    merchants: z.array(z.object({ slug, name: z.string().min(1) })),
    pickupStores: z
      .array(z.object({ merchantSlug: slug, externalStoreId: z.string().min(1), name: z.string().min(1) }))
      .default([]),
    products: z.array(product),
    listings: z.array(listing).default([]),
  })
  .superRefine((s, ctx) => {
    const merchants = new Set(s.merchants.map((m) => m.slug));
    const products = new Set(s.products.map((p) => p.slug));
    s.listings.forEach((l, i) => {
      if (!products.has(l.productSlug)) ctx.addIssue({ code: "custom", path: ["listings", i, "productSlug"], message: "unknown product" });
      if (!merchants.has(l.merchantSlug)) ctx.addIssue({ code: "custom", path: ["listings", i, "merchantSlug"], message: "unknown merchant" });
    });
    s.pickupStores.forEach((p, i) => {
      if (!merchants.has(p.merchantSlug)) ctx.addIssue({ code: "custom", path: ["pickupStores", i, "merchantSlug"], message: "unknown merchant" });
    });
  });

export type SeedFile = z.infer<typeof SeedFile>;

export function parseSeed(json: unknown): SeedFile {
  return SeedFile.parse(json);
}
