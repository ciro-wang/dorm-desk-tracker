import { describe, expect, it } from "vitest";
import { timeAgo } from "@/lib/time";

const now = new Date("2026-11-27T12:00:00Z");
describe("timeAgo", () => {
  it("speaks plainly", () => {
    expect(timeAgo("2026-11-27T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-27T11:48:00Z", now)).toBe("12 min ago");
    expect(timeAgo("2026-11-27T09:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2026-11-25T12:00:00Z", now)).toBe("2 days ago");
    expect(timeAgo("2026-11-26T11:00:00Z", now)).toBe("1 day ago");
  });
});
