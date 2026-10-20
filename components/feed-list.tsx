import { timeAgo } from "@/lib/time";
import type { NewsItem, Product } from "@/lib/types";

const SOURCE: Record<NewsItem["source"], string> = { rfd: "RedFlagDeals", reddit: "Reddit" };

export function FeedList({ items, products, now }: { items: NewsItem[]; products: Product[]; now: Date }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No deal posts yet. The feed refreshes every 20 minutes.</p>;
  const nameOf = new Map(products.map((p) => [p.id, p.name]));
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border bg-card">
      {items.map((n) => (
        <li key={n.id}>
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-secondary/60">
            <span className="text-sm leading-snug text-foreground">{n.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{SOURCE[n.source]}</span>
              <span aria-hidden>·</span>
              <span>{timeAgo(n.publishedAt, now)}</span>
              {n.matchedProductIds.map((id) => (
                <span key={id} className="rounded border border-sage/40 px-1.5 text-sage">
                  {nameOf.get(id) ?? "Watched product"}
                </span>
              ))}
              {n.tags.includes("toronto") && <span className="rounded border border-oak/40 px-1.5 text-oak">Toronto / in-store</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
