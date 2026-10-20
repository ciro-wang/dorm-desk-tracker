"use client";

import { useActionState } from "react";
import { addListing, updateProductTargets, type FormState } from "./actions";
import type { Merchant, Product } from "@/lib/types";

const field = "rounded-md border border-border bg-ink px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
const dollars = (c: number) => (c / 100).toFixed(2);

function Status({ state }: { state: FormState }) {
  if (state.error) return <span role="alert" className="text-xs text-clay">{state.error}</span>;
  if (state.ok) return <span className="text-xs text-sage">Saved</span>;
  return null;
}

export function TargetsForm({ product }: { product: Product }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProductTargets, { ok: false, error: null });
  const range = product.category === "speaker";
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="productId" value={product.id} />
      {range && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Great deal at ($)
          <input name="targetLow" defaultValue={dollars(product.targetLowCents)} inputMode="decimal" className={`${field} w-28`} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {range ? "Target up to ($)" : "Target ($)"}
        <input name="targetHigh" defaultValue={dollars(product.targetHighCents)} inputMode="decimal" className={`${field} w-28`} />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" name="active" defaultChecked={product.active} /> Watching
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" name="alertsEnabled" defaultChecked={product.alertsEnabled} /> Phone alerts
      </label>
      <button type="submit" disabled={pending} className="rounded-md bg-secondary px-3 py-1.5 text-xs text-foreground hover:bg-accent disabled:opacity-60">
        Save
      </button>
      <Status state={state} />
    </form>
  );
}

export function AddListingForm({ productId, merchants }: { productId: string; merchants: Merchant[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addListing, { ok: false, error: null });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="productId" value={productId} />
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Store
        <select name="merchantId" required className={field}>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
        Product link (https)
        <input name="url" type="url" required placeholder="https://…" className={`${field} w-full min-w-[12rem]`} />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" name="autoCheck" defaultChecked /> Check automatically
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Let this marketplace seller's prices count toward best price and alerts">
        <input type="checkbox" name="trustedSeller" /> Trusted seller
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" name="isBundle" /> Bundle
      </label>
      <input name="bundleContents" placeholder="Bundle includes… (optional)" className={`${field} w-56`} />
      <button type="submit" disabled={pending} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
        Add listing
      </button>
      <Status state={state} />
    </form>
  );
}
