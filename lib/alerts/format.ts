import type { AlertEvent } from "@/lib/alerts/decide";
import { formatCad } from "@/lib/money";
import { greatThresholdCents } from "@/lib/pricing/verdict";
import type { Product } from "@/lib/types";

export interface Notification {
  title: string;
  message: string;
  clickUrl: string;
  priority: 3 | 4;
}

export function formatAlert(e: AlertEvent, product: Product, appBaseUrl: string): Notification {
  const price = formatCad(e.cents);
  const reason = {
    below_target: `below your ${formatCad(product.targetHighCents)} target`,
    great_deal: `great deal (≤ ${formatCad(greatThresholdCents(product))})`,
    lower_again: `new low, down ${formatCad((e.previousCents ?? e.cents) - e.cents)}`,
    pickup_available: "now in stock downtown",
  }[e.kind];
  const pickup = e.pickupNearby && e.kind !== "pickup_available" ? " · pickup downtown in stock" : "";

  return {
    title: `${product.name} · ${price}`,
    message: `${price} at ${e.merchantName}${pickup} · ${reason}`,
    clickUrl: `${appBaseUrl.replace(/\/$/, "")}/product/${product.slug}`,
    priority: e.kind === "great_deal" || e.kind === "pickup_available" ? 4 : 3,
  };
}
