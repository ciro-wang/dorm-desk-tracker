import { describe, expect, it } from "vitest";
import { BADGE_LABELS, badgesFor } from "@/lib/badges";
import { monitor, speaker } from "./helpers/factories";

const noVerdict = { level: "target" as const, inflatedWas: false, reasons: [] };

describe("badgesFor", () => {
  it("gives an OLED monitor at target its badges", () => {
    const b = badgesFor(monitor(), { cents: 106000, pickupNearby: true, source: "scraped" }, noVerdict);
    expect(b).toEqual(["target_reached", "single_cable", "fits_shelf", "needs_verification", "pickup_downtown"]);
  });

  it("fits a 48 cm curved panel under the 52 cm shelf without single-cable docking", () => {
    const curved = monitor({ specs: { kind: "monitor", sizeIn: 32, resW: 3840, resH: 2160, refreshHz: 240, panel: "OLED", panelHeightCm: 48, usbcPdW: 15, curve: "1800R" } });
    const b = badgesFor(curved, null, { level: "unknown", inflatedWas: false, reasons: [] });
    expect(b).toContain("fits_shelf");
    expect(b).not.toContain("single_cable");
  });

  it("rejects a panel taller than the shelf", () => {
    const tall = monitor({ specs: { kind: "monitor", sizeIn: 34, resW: 3440, resH: 1440, refreshHz: 175, panel: "QD-OLED", panelHeightCm: 52.1, usbcPdW: 90, curve: null } });
    expect(badgesFor(tall, null, noVerdict)).not.toContain("fits_shelf");
  });

  it("shows sub-out only when known true", () => {
    expect(badgesFor(speaker(), null, noVerdict)).not.toContain("sub_out");
    expect(badgesFor(speaker({ specs: { kind: "speaker", wooferIn: 5, subOut: true, dimensionsMm: null, inputs: [] } }), null, noVerdict)).toContain("sub_out");
  });

  it("flags inflated was-prices and manual entries need no verification", () => {
    const b = badgesFor(monitor(), { cents: 130000, pickupNearby: false, source: "manual" }, { level: "not_a_deal", inflatedWas: true, reasons: [] });
    expect(b).toContain("inflated_was");
    expect(b).not.toContain("needs_verification");
    expect(b).not.toContain("target_reached");
  });

  it("labels badges in plain words", () => {
    expect(BADGE_LABELS.target_reached).toBe("Target Deal Reached");
    expect(BADGE_LABELS.single_cable).toBe("Single-Cable Docking");
    expect(BADGE_LABELS.fits_shelf).toBe("Fits Shelf Height");
    expect(BADGE_LABELS.sub_out).toBe("Sub-Out Available");
    expect(BADGE_LABELS.inflated_was).toBe("Inflated “Was” Price");
    expect(BADGE_LABELS.needs_verification).toBe("Needs Your Verification");
    expect(BADGE_LABELS.pickup_downtown).toBe("Pickup Downtown");
    expect(BADGE_LABELS.bundle).toBe("Bundle");
  });
});
