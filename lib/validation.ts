import { z } from "zod";

const Tri = z.enum(["yes", "no", "unknown"]);

/** Dollars typed by a person: plain digits with at most two decimals, $0.01 to $20,000. */
export const DollarString = z
  .string()
  .trim()
  .regex(/^\d{1,5}(\.\d{1,2})?$/, "Enter a price like 1149.99")
  .transform((s) => Math.round(Number(s) * 100))
  .refine((c) => c >= 1 && c <= 2_000_000, "Price must be between $0.01 and $20,000");

export const ManualPriceInput = z
  .object({
    listingId: z.uuid(),
    price: DollarString,
    inStockOnline: Tri,
    pickupInStock: Tri,
  })
  .transform(({ price, ...rest }) => ({ ...rest, priceCents: price }));

export type ManualPriceInput = z.infer<typeof ManualPriceInput>;

/** An HTML checkbox: "on" when ticked, absent otherwise. */
const checkbox = z
  .literal("on")
  .nullish()
  .transform((v) => v === "on");

export const TargetsInput = z
  .object({
    productId: z.uuid(),
    targetHigh: DollarString,
    targetLow: DollarString.optional(),
    active: checkbox,
    alertsEnabled: checkbox,
  })
  .refine((v) => v.targetLow == null || v.targetLow <= v.targetHigh, { message: "The low end can't be above the high end", path: ["targetLow"] })
  .transform(({ targetHigh, targetLow, ...rest }) => ({ ...rest, targetHighCents: targetHigh, targetLowCents: targetLow ?? targetHigh }));

/** Monitors have one target; speakers have a range. */
export function normalizeTargets(
  category: "monitor" | "speaker",
  t: { targetHighCents: number; targetLowCents: number },
): { targetHighCents: number; targetLowCents: number } {
  return category === "monitor" ? { targetHighCents: t.targetHighCents, targetLowCents: t.targetHighCents } : t;
}

export const ListingInput = z.object({
  productId: z.uuid(),
  merchantId: z.uuid(),
  url: z.string().trim().max(2000),
  isBundle: checkbox,
  bundleContents: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((v) => v || null),
  autoCheck: checkbox,
  trustedSeller: checkbox,
});
