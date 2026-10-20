import { describe, expect, it } from "vitest";
import { formatAlert } from "@/lib/alerts/format";
import { monitor } from "../helpers/factories";

const mon = monitor();
const base = "https://tracker.example.app";

describe("formatAlert", () => {
  it("formats a below-target alert with pickup", () => {
    expect(formatAlert({ kind: "below_target", cents: 106000, merchantName: "Canada Computers", pickupNearby: true }, mon, base)).toEqual({
      title: "Example OLED Monitor M27X · $1,060.00",
      message: "$1,060.00 at Canada Computers · pickup downtown in stock · below your $1,100.00 target",
      clickUrl: "https://tracker.example.app/product/example-monitor",
      priority: 3,
    });
  });

  it("formats great-deal, lower-again and pickup alerts", () => {
    expect(formatAlert({ kind: "great_deal", cents: 104000, merchantName: "Best Buy", pickupNearby: false }, mon, base)).toMatchObject({
      message: "$1,040.00 at Best Buy · great deal (≤ $1,045.00)",
      priority: 4,
    });
    expect(
      formatAlert({ kind: "lower_again", cents: 108000, previousCents: 109500, merchantName: "Best Buy", pickupNearby: false }, mon, base).message,
    ).toBe("$1,080.00 at Best Buy · new low, down $15.00");
    expect(formatAlert({ kind: "pickup_available", cents: 109500, merchantName: "Canada Computers", pickupNearby: true }, mon, base)).toMatchObject({
      message: "$1,095.00 at Canada Computers · now in stock downtown",
      priority: 4,
    });
  });
});
