import { badgesFor, type BadgeKind } from "@/lib/badges";
import { bestPriceNow, type BestPrice } from "@/lib/pricing/best-price";
import { historyStats, type HistoryStats } from "@/lib/pricing/stats";
import { verdict } from "@/lib/pricing/verdict";
import { daysBetween } from "@/lib/time";
import type { Listing, PriceLog, Product, Verdict } from "@/lib/types";

export const NO_PRICE_MESSAGE = "No verified price, check manually";

export interface WatchRow {
  product: Product;
  best: BestPrice | null;
  verdict: Verdict;
  stats: HistoryStats;
  changeVs7dCents: number | null;
  badges: BadgeKind[];
  emptyMessage: string | null;
}

export function buildWatchRow(
  product: Product,
  entries: { listing: Listing; latest: PriceLog | null }[],
  history: { at: Date; cents: number }[],
  pickupStoreIds: string[],
  now: Date,
): WatchRow {
  const best = bestPriceNow(entries, now, pickupStoreIds);
  const stats = historyStats(history, now);
  const wasPriceCents = best ? (entries.find((e) => e.listing.id === best.listingId)?.latest?.wasPriceCents ?? null) : null;
  const v = verdict({ bestCents: best?.cents ?? null, product, stats, wasPriceCents });
  const weekAgo = history.find((h) => daysBetween(h.at, now) === 7);

  return {
    product,
    best,
    verdict: v,
    stats,
    changeVs7dCents: best && weekAgo ? best.cents - weekAgo.cents : null,
    badges: badgesFor(product, best, v),
    emptyMessage: best ? null : NO_PRICE_MESSAGE,
  };
}
