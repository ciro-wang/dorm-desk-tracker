import { greatThresholdCents } from "@/lib/pricing/verdict";
import type { Product } from "@/lib/types";

export type AlertKind = "below_target" | "great_deal" | "lower_again" | "pickup_available";

export interface AlertState {
  productId: string;
  lastAlertedCents: number | null;
  sentKinds: AlertKind[];
  pickupNearby: boolean;
  aboveTargetSince: string | null;
  /** When downtown pickup was last seen to disappear; pickup alerts re-arm 12 h after that. */
  pickupGoneSince: string | null;
}

export interface AlertEvent {
  kind: AlertKind;
  cents: number;
  previousCents?: number;
  merchantName: string;
  pickupNearby: boolean;
}

const REARM_AFTER_MS = 12 * 3600_000;

/**
 * One alert per event, never one per check. A product re-arms (can alert "below target" again)
 * only after its best price has stayed above target for 12 hours.
 */
export function decideAlerts(
  prev: AlertState | null,
  cur: {
    bestCents: number | null;
    merchantName: string;
    /** null = not observed this run (keep previous). */
    pickupNearby: boolean | null;
    pickupCents?: number;
    pickupMerchantName?: string;
  },
  product: Product,
  now: Date,
): { events: AlertEvent[]; next: AlertState } {
  const state: AlertState = prev ?? {
    productId: product.id,
    lastAlertedCents: null,
    sentKinds: [],
    pickupNearby: false,
    aboveTargetSince: null,
    pickupGoneSince: null,
  };
  if (cur.bestCents == null) return { events: [], next: state };

  const best = cur.bestCents;
  const next: AlertState = { ...state, sentKinds: [...state.sentKinds] };

  // Pickup state: unknown observations change nothing; re-arm after 12 h without pickup.
  const goneLongEnough = state.pickupGoneSince != null && now.getTime() - Date.parse(state.pickupGoneSince) >= REARM_AFTER_MS;
  if (cur.pickupNearby === true) {
    if (goneLongEnough) next.sentKinds = next.sentKinds.filter((k) => k !== "pickup_available");
    next.pickupNearby = true;
    next.pickupGoneSince = null;
  } else if (cur.pickupNearby === false) {
    next.pickupNearby = false;
    next.pickupGoneSince = state.pickupGoneSince ?? now.toISOString();
  }

  if (best > product.targetHighCents) {
    next.aboveTargetSince = state.aboveTargetSince ?? now.toISOString();
    return { events: [], next };
  }

  if (state.aboveTargetSince && now.getTime() - Date.parse(state.aboveTargetSince) >= REARM_AFTER_MS) {
    next.sentKinds = [];
    next.lastAlertedCents = null;
  }
  next.aboveTargetSince = null;

  const events: AlertEvent[] = [];
  const event = (kind: AlertKind, extra: Partial<AlertEvent> = {}) =>
    events.push({ kind, cents: best, merchantName: cur.merchantName, pickupNearby: cur.pickupNearby === true, ...extra });

  if (!next.sentKinds.includes("below_target")) event("below_target");
  if (best <= greatThresholdCents(product) && !next.sentKinds.includes("great_deal")) event("great_deal");

  const last = next.lastAlertedCents;
  if (!events.length && last != null && best < last - Math.max(500, Math.round(last * 0.01))) {
    event("lower_again", { previousCents: last });
  }
  if (cur.pickupNearby === true && !next.sentKinds.includes("pickup_available")) {
    event("pickup_available", { cents: cur.pickupCents ?? best, merchantName: cur.pickupMerchantName ?? cur.merchantName, pickupNearby: true });
  }

  for (const e of events) if (!next.sentKinds.includes(e.kind) && e.kind !== "lower_again") next.sentKinds.push(e.kind);
  if (events.some((e) => e.kind !== "pickup_available")) next.lastAlertedCents = best;

  return { events, next };
}
