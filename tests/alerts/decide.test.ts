import { describe, expect, it } from "vitest";
import { decideAlerts, type AlertState } from "@/lib/alerts/decide";
import { monitor, speaker } from "../helpers/factories";

const mon = monitor();
const t = (h: number) => new Date(Date.parse("2026-11-27T00:00:00Z") + h * 3600_000);

function run(prices: (number | null)[], product = mon, pickup: (boolean | null)[] = [], stepHours = 0.5) {
  let state: AlertState | null = null;
  return prices.map((cents, i) => {
    const { events, next } = decideAlerts(state, { bestCents: cents, merchantName: "Canada Computers", pickupNearby: pickup[i] ?? false }, product, t(i * stepHours));
    state = next;
    return events.map((e) => e.kind);
  });
}

describe("decideAlerts", () => {
  it("alerts once when crossing target and ignores small wobbles", () => {
    expect(run([115000, 109500, 111000, 109000, 108900, 108000])).toEqual([
      [],
      ["below_target"],
      [],
      [],
      [],
      ["lower_again"],
    ]);
  });

  it("re-arms only after 12 hours above target", () => {
    expect(run([109500, 115000, 115000, 109500], mon, [], 6.5)).toEqual([["below_target"], [], [], ["below_target"]]);
    expect(run([109500, 115000, 109500], mon, [], 5)).toEqual([["below_target"], [], []]);
  });

  it("sends a great-deal alert at or below the great threshold", () => {
    expect(run([104000])).toEqual([["below_target", "great_deal"]]);
    expect(run([20900], speaker())).toEqual([["below_target", "great_deal"]]);
    expect(run([23000, 20900], speaker())).toEqual([["below_target"], ["great_deal"]]);
  });

  it("alerts when downtown pickup appears while below target", () => {
    expect(run([109500, 109500, 109500], mon, [false, true, true])).toEqual([["below_target"], ["pickup_available"], []]);
    expect(run([115000, 115000], mon, [false, true])).toEqual([[], []]);
  });

  it("does not repeat a pickup alert when the pickup listing flickers in and out of view", () => {
    expect(run([109500, 109500, 109500, 109500, 109500], mon, [true, false, true, null, true])).toEqual([
      ["below_target", "pickup_available"],
      [],
      [],
      [],
      [],
    ]);
  });

  it("re-arms pickup only after it has been gone for 12 hours", () => {
    expect(run([109500, 109500, 109500, 109500], mon, [true, false, false, true], 6.5)).toEqual([["below_target", "pickup_available"], [], [], ["pickup_available"]]);
  });

  it("does nothing without a price and keeps state", () => {
    const prev: AlertState = { productId: mon.id, lastAlertedCents: 109500, sentKinds: ["below_target"], pickupNearby: false, aboveTargetSince: null, pickupGoneSince: null };
    const r = decideAlerts(prev, { bestCents: null, merchantName: "x", pickupNearby: false }, mon, t(0));
    expect(r.events).toEqual([]);
    expect(r.next).toEqual(prev);
  });

  it("carries the previous alerted price on lower_again", () => {
    let state: AlertState | null = null;
    state = decideAlerts(state, { bestCents: 109500, merchantName: "CC", pickupNearby: false }, mon, t(0)).next;
    const { events } = decideAlerts(state, { bestCents: 108000, merchantName: "CC", pickupNearby: false }, mon, t(1));
    expect(events).toEqual([{ kind: "lower_again", cents: 108000, previousCents: 109500, merchantName: "CC", pickupNearby: false }]);
  });
});
