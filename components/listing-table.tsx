import { ManualPriceForm } from "@/components/manual-price-form";
import { effectiveCents, isStale } from "@/lib/pricing/best-price";
import { formatCad } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import type { Listing, Merchant, PriceLog } from "@/lib/types";

export interface ListingRowData {
  listing: Listing;
  merchant: Merchant | undefined;
  latest: PriceLog | null;
  pickupIds: string[];
}

function statusLine(latest: PriceLog | null, now: Date) {
  if (!latest) return <span className="text-clay">Not checked yet · enter manually</span>;
  const when = `checked ${timeAgo(latest.checkedAt, now)}`;
  if (latest.status !== "ok") return <span className="text-clay">Couldn’t check ({when}) · verify manually</span>;
  if (latest.source === "manual") return <span className="text-muted-foreground">{when} · entered by you</span>;
  return (
    <span className="text-muted-foreground">
      {when} · <span className="text-oak">needs your verification</span>
      {isStale(latest.checkedAt, now) && <span className="text-clay"> · out of date</span>}
    </span>
  );
}

const yesNo = (v: boolean | null) => (v == null ? "—" : v ? "Yes" : "No");

export function ListingTable({ rows, now, bestListingId }: { rows: ListingRowData[]; now: Date; bestListingId: string | null }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-medium">Store</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Online</th>
            <th className="px-4 py-3 font-medium">Downtown pickup</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map(({ listing, merchant, latest, pickupIds }) => {
            const cents = latest?.status === "ok" ? effectiveCents(latest) : null;
            const downtown = latest?.pickup.filter((p) => pickupIds.includes(p.externalStoreId)) ?? [];
            return (
              <tr key={listing.id} className={listing.id === bestListingId ? "bg-sage/5" : undefined}>
                <td className="px-4 py-3 align-top">
                  <a href={listing.url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-oak hover:underline">
                    {merchant?.name ?? "Store"}
                  </a>
                  {listing.id === bestListingId && <span className="ml-2 text-xs text-sage">best</span>}
                  {!listing.autoCheck && <div className="text-xs text-muted-foreground">manual only</div>}
                  {listing.trustedSeller && <div className="text-xs text-muted-foreground">trusted seller</div>}
                </td>
                <td className="px-4 py-3 align-top tabular-nums">
                  {cents != null ? formatCad(cents) : "—"}
                  {latest?.shippingCents ? <div className="text-xs text-muted-foreground">incl. {formatCad(latest.shippingCents)} shipping</div> : null}
                </td>
                <td className="px-4 py-3 align-top">{yesNo(latest?.inStockOnline ?? null)}</td>
                <td className="px-4 py-3 align-top">
                  {downtown.length ? downtown.map((d) => <div key={d.externalStoreId} className={d.inStock ? "text-sage" : "text-muted-foreground"}>{d.inStock ? "In stock" : "Not in stock"} · {d.storeName}</div>) : "—"}
                </td>
                <td className="px-4 py-3 align-top text-xs">
                  {statusLine(latest, now)}
                  <div className="mt-2">
                    <ManualPriceForm listingId={listing.id} hasPickupStores={pickupIds.length > 0} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
