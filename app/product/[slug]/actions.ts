"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/db/ssr";
import { priceLogToRow } from "@/lib/db/mappers";
import { ManualPriceInput } from "@/lib/validation";

export type ManualPriceState = { ok: boolean; error: string | null };

const tri = (v: "yes" | "no" | "unknown") => (v === "unknown" ? null : v === "yes");

export async function submitManualPrice(_prev: ManualPriceState, formData: FormData): Promise<ManualPriceState> {
  const { db } = await requireUser();
  const parsed = ManualPriceInput.safeParse({
    listingId: formData.get("listingId"),
    price: formData.get("price"),
    inStockOnline: formData.get("inStockOnline"),
    pickupInStock: formData.get("pickupInStock"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the price and try again" };
  const input = parsed.data;

  const { data: listing, error: lErr } = await db
    .from("listings")
    .select("id, merchant_id, products!inner(slug)")
    .eq("id", input.listingId)
    .maybeSingle();
  if (lErr || !listing) return { ok: false, error: "That listing no longer exists" };

  let pickup: { externalStoreId: string; storeName: string; inStock: boolean }[] = [];
  const inStore = tri(input.pickupInStock);
  if (inStore != null) {
    const { data: stores } = await db.from("pickup_stores").select("external_store_id, name").eq("merchant_id", listing.merchant_id);
    pickup = (stores ?? []).map((s) => ({ externalStoreId: s.external_store_id, storeName: s.name, inStock: inStore }));
  }

  const { error } = await db.from("price_logs").insert(
    priceLogToRow({
      listingId: input.listingId,
      checkedAt: new Date().toISOString(),
      source: "manual",
      status: "ok",
      priceCents: input.priceCents,
      wasPriceCents: null,
      shippingCents: null,
      inStockOnline: tri(input.inStockOnline),
      pickup,
      condition: "new",
      seller: "retailer",
      colour: null,
      error: null,
    }),
  );
  if (error) return { ok: false, error: "Couldn't save that price. Try again." };

  const slug = (listing.products as unknown as { slug: string }).slug;
  revalidatePath(`/product/${slug}`);
  revalidatePath("/");
  return { ok: true, error: null };
}
