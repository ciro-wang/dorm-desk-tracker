"use client";

import { useActionState } from "react";
import { submitManualPrice, type ManualPriceState } from "@/app/product/[slug]/actions";

const field = "rounded-md border border-border bg-ink px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

export function ManualPriceForm({ listingId, hasPickupStores }: { listingId: string; hasPickupStores: boolean }) {
  const [state, action, pending] = useActionState<ManualPriceState, FormData>(submitManualPrice, { ok: false, error: null });
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-xs text-oak hover:underline">Enter price I’m seeing</summary>
      <form action={action} className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-3">
        <input type="hidden" name="listingId" value={listingId} />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Price (CAD) $
          <input name="price" inputMode="decimal" placeholder="1149.99" required className={`${field} w-28`} />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          In stock online
          <select name="inStockOnline" defaultValue="unknown" className={field}>
            <option value="unknown">Not sure</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className={`flex items-center gap-2 text-xs text-muted-foreground ${hasPickupStores ? "" : "hidden"}`}>
          Downtown pickup
          <select name="pickupInStock" defaultValue="unknown" className={field}>
            <option value="unknown">Not sure</option>
            <option value="yes">In stock</option>
            <option value="no">Not in stock</option>
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
            {pending ? "Saving…" : "Save price"}
          </button>
          {state.ok && <span className="text-xs text-sage">Saved, marked as entered by you.</span>}
          {state.error && <span role="alert" className="text-xs text-clay">{state.error}</span>}
        </div>
      </form>
    </details>
  );
}
