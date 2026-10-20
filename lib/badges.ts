import type { Product, Verdict } from "@/lib/types";

export type BadgeKind =
  | "target_reached"
  | "single_cable"
  | "fits_shelf"
  | "sub_out"
  | "inflated_was"
  | "needs_verification"
  | "pickup_downtown"
  | "bundle";

export const BADGE_LABELS: Record<BadgeKind, string> = {
  target_reached: "Target Deal Reached",
  single_cable: "Single-Cable Docking",
  fits_shelf: "Fits Shelf Height",
  sub_out: "Sub-Out Available",
  inflated_was: "Inflated “Was” Price",
  needs_verification: "Needs Your Verification",
  pickup_downtown: "Pickup Downtown",
  bundle: "Bundle",
};

/** Desk shelf clearance for a monitor on an arm (panel only, no stand). */
export const SHELF_LIMIT_CM = 52;
/** USB-C power delivery needed to charge a MacBook Pro over the display cable. */
export const SINGLE_CABLE_MIN_W = 90;

export function badgesFor(
  p: Product,
  best: { cents: number; pickupNearby: boolean; source: "scraped" | "manual" } | null,
  v: Verdict,
): BadgeKind[] {
  const out: BadgeKind[] = [];
  if (best && best.cents <= p.targetHighCents) out.push("target_reached");
  if (p.specs.kind === "monitor") {
    if ((p.specs.usbcPdW ?? 0) >= SINGLE_CABLE_MIN_W) out.push("single_cable");
    if (p.specs.panelHeightCm <= SHELF_LIMIT_CM) out.push("fits_shelf");
  } else if (p.specs.subOut === true) {
    out.push("sub_out");
  }
  if (v.inflatedWas) out.push("inflated_was");
  if (best?.source === "scraped") out.push("needs_verification");
  if (best?.pickupNearby) out.push("pickup_downtown");
  return out;
}
