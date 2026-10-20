import { formatCad } from "@/lib/money";
import type { HistoryStats } from "@/lib/pricing/stats";
import type { Product, Verdict } from "@/lib/types";

export function greatThresholdCents(p: Product): number {
  return p.targetLowCents < p.targetHighCents ? p.targetLowCents : Math.round(p.targetHighCents * 0.95);
}

export function verdict(input: {
  bestCents: number | null;
  product: Product;
  stats: HistoryStats;
  wasPriceCents: number | null;
}): Verdict {
  const { bestCents, product: p, stats, wasPriceCents: was } = input;
  const reasons: string[] = [];

  const inflatedVsHistory = was != null && stats.historyDays >= 7 && stats.max60dCents != null && was > stats.max60dCents * 1.05;
  const inflatedVsMsrp = was != null && was > p.msrpCents * 1.05;
  if (inflatedVsHistory) reasons.push("“Was” price is higher than anything seen in the last 60 days");
  else if (inflatedVsMsrp) reasons.push("“Was” price is above MSRP");
  const inflatedWas = inflatedVsHistory || inflatedVsMsrp;

  if (bestCents == null) return { level: "unknown", inflatedWas, reasons };

  const lowRef = Math.min(stats.allTimeLowCents ?? Infinity, p.referenceLowCents ?? Infinity);
  const great = greatThresholdCents(p);
  const typical = stats.typical30dCents;

  let level: Verdict["level"];
  if (stats.historyDays >= 7 && bestCents <= lowRef) {
    level = "all_time_low";
    reasons.unshift("Lowest price seen so far");
  } else if (bestCents <= great) {
    level = "great";
  } else if (bestCents <= p.targetHighCents) {
    level = "target";
  } else if (typical != null && bestCents <= typical * 0.9) {
    level = "fair";
    reasons.push("At least 10% below the usual price over the last 30 days");
  } else {
    level = "not_a_deal";
  }

  if (bestCents <= great) reasons.push(`At or below your great-deal price of ${formatCad(great)}`);
  if (bestCents <= p.targetHighCents) reasons.push(`Below your ${formatCad(p.targetHighCents)} target`);

  return { level, inflatedWas, reasons };
}
