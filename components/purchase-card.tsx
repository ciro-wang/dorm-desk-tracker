import Link from "next/link";
import type { PurchaseOffer } from "@/lib/alerts/purchase";
import { formatCad } from "@/lib/money";
import { daysBetween, torontoDate } from "@/lib/time";
import type { Product, Purchase } from "@/lib/types";

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function PurchaseCard({
  purchase: x,
  product,
  storeName,
  offer,
  now,
  linkToProduct = true,
}: {
  purchase: Purchase;
  product: Product;
  storeName: string;
  offer: PurchaseOffer | null;
  now: Date;
  linkToProduct?: boolean;
}) {
  const daysLeft = daysBetween(now, new Date(`${x.claimBy}T12:00:00-05:00`));
  const open = torontoDate(now) <= x.claimBy;
  const gap = offer ? x.paidCents - offer.cents : null;
  const offerPrice = offer?.native ? `US$${(offer.native.cents / 100).toFixed(2)} (≈ ${formatCad(offer.cents)})` : offer ? formatCad(offer.cents) : null;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base leading-snug">
          {linkToProduct ? <Link href={`/product/${product.slug}`} className="hover:text-oak">{product.name}</Link> : "You bought this"}
        </h3>
        <span className={`shrink-0 text-xs ${open ? (daysLeft <= 7 ? "text-clay" : "text-muted-foreground") : "text-muted-foreground"}`}>
          {open ? `claim by ${longDate(x.claimBy)} · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "claim window closed"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Paid <span className="text-foreground tabular-nums">{formatCad(x.paidCents)}</span>
        {x.paidTotalCents != null && <> ({formatCad(x.paidTotalCents)} with tax)</>} at {storeName} on {longDate(x.purchasedOn)}
      </p>
      {offer ? (
        <p className="text-sm">
          Lowest now: <span className="tabular-nums">{offerPrice}</span> at {offer.merchantName}
          {gap != null && gap > 0 ? (
            <span className="text-sage"> · {formatCad(gap)} under what you paid</span>
          ) : (
            <span className="text-muted-foreground"> · not below what you paid</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No current price yet. Enter one on the product page if a store can’t be checked automatically.</p>
      )}
      {x.claimNote && <p className="text-xs text-muted-foreground">{x.claimNote}</p>}
    </article>
  );
}
