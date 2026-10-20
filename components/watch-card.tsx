import Link from "next/link";
import { Badges } from "@/components/badges";
import { Change, Price } from "@/components/price";
import { VerdictPill } from "@/components/verdict-pill";
import type { WatchRow } from "@/lib/dashboard";
import { formatCad } from "@/lib/money";
import { timeAgo } from "@/lib/time";

export function WatchCard({ row, merchantName, now }: { row: WatchRow; merchantName: string | null; now: Date }) {
  const { product: p, best } = row;
  const target =
    p.targetLowCents < p.targetHighCents ? `${formatCad(p.targetLowCents)}–${formatCad(p.targetHighCents)}` : `≤ ${formatCad(p.targetHighCents)}`;
  return (
    <Link
      href={`/product/${p.slug}`}
      className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-oak/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base leading-snug text-foreground group-hover:text-oak">{p.name}</h3>
        <VerdictPill level={row.verdict.level} />
      </div>

      {best ? (
        <div>
          <Price cents={best.cents} className="font-heading text-3xl text-foreground" />
          <p className="mt-1 text-sm text-muted-foreground">
            at {merchantName ?? "a store"} · checked {timeAgo(best.checkedAt, now)} ·{" "}
            {best.source === "manual" ? "entered by you" : <span className="text-oak">needs your verification</span>}
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{row.emptyMessage}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">
          Target {target} · MSRP {formatCad(p.msrpCents)}
        </span>
        {best && <Change cents={row.changeVs7dCents} />}
      </div>
      <Badges kinds={row.badges} />
    </Link>
  );
}
