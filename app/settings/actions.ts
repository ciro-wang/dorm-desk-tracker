"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/db/ssr";
import { isMerchantUrl } from "@/lib/merchants";
import { ListingInput, normalizeTargets, TargetsInput } from "@/lib/validation";

export type FormState = { ok: boolean; error: string | null };

const done = (): FormState => {
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true, error: null };
};

export async function updateProductTargets(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireUser();
  const productId = z.uuid().safeParse(formData.get("productId"));
  if (!productId.success) return { ok: false, error: "Unknown product" };
  const { data: product } = await db.from("products").select("category").eq("id", productId.data).maybeSingle();
  if (!product) return { ok: false, error: "Unknown product" };

  const parsed = TargetsInput.safeParse({
    productId: productId.data,
    targetHigh: formData.get("targetHigh"),
    targetLow: product.category === "monitor" ? undefined : (formData.get("targetLow") ?? undefined),
    active: formData.get("active"),
    alertsEnabled: formData.get("alertsEnabled"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the targets" };
  const v = parsed.data;
  const t = normalizeTargets(product.category, v);
  const { error } = await db
    .from("products")
    .update({ target_high_cents: t.targetHighCents, target_low_cents: t.targetLowCents, active: v.active, alerts_enabled: v.alertsEnabled })
    .eq("id", v.productId);
  return error ? { ok: false, error: "Couldn't save. Try again." } : done();
}

export async function addListing(_prev: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireUser();
  const parsed = ListingInput.safeParse({
    productId: formData.get("productId"),
    merchantId: formData.get("merchantId"),
    url: formData.get("url"),
    isBundle: formData.get("isBundle"),
    bundleContents: formData.get("bundleContents"),
    autoCheck: formData.get("autoCheck"),
  });
  if (!parsed.success) return { ok: false, error: "Check the store and link" };
  const v = parsed.data;

  const { data: merchant } = await db.from("merchants").select("slug").eq("id", v.merchantId).maybeSingle();
  if (!merchant || !isMerchantUrl(v.url, merchant.slug)) return { ok: false, error: "The link must be an https link on that store's own website" };

  const { error } = await db.from("listings").insert({
    product_id: v.productId,
    merchant_id: v.merchantId,
    url: v.url,
    is_bundle: v.isBundle,
    bundle_contents: v.isBundle ? v.bundleContents : null,
    auto_check: v.autoCheck,
    trusted_seller: v.trustedSeller,
  });
  return error ? { ok: false, error: error.code === "23505" ? "That link is already on this product" : "Couldn't add the listing" } : done();
}

export async function removeListing(formData: FormData): Promise<void> {
  const { db } = await requireUser();
  const id = z.uuid().safeParse(formData.get("listingId"));
  if (!id.success) return;
  await db.from("listings").delete().eq("id", id.data);
  done();
}

/** Marketplace sellers you trust count toward best price and alerts. */
export async function toggleTrustedSeller(formData: FormData): Promise<void> {
  const { db } = await requireUser();
  const id = z.uuid().safeParse(formData.get("listingId"));
  if (!id.success) return;
  await db.from("listings").update({ trusted_seller: formData.get("trustedSeller") === "on" }).eq("id", id.data);
  done();
}

export async function toggleAutoCheck(formData: FormData): Promise<void> {
  const { db } = await requireUser();
  const id = z.uuid().safeParse(formData.get("listingId"));
  if (!id.success) return;
  await db.from("listings").update({ auto_check: formData.get("autoCheck") === "on" }).eq("id", id.data);
  done();
}
