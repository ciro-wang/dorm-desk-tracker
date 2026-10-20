import { describe, expect, it } from "vitest";
import { modelTokens, scoreNewsItem } from "@/lib/news/relevance";
import type { NewsItemInput } from "@/lib/types";
import { monitor, speaker } from "../helpers/factories";

const mon = monitor();
const spk = speaker();
const item = (title: string): NewsItemInput => ({ source: "rfd", sourceId: "1", title, url: "https://x", publishedAt: "2026-11-27T12:00:00Z", excerpt: "" });

describe("modelTokens", () => {
  it("uses tokens that mix letters and digits", () => {
    expect(modelTokens(mon)).toEqual(["m27x"]);
    expect(modelTokens(speaker({ name: "Acme R-55PX" }))).toEqual(["r55px"]);
    expect(modelTokens(spk)).toEqual(["s50"]);
  });
});

describe("scoreNewsItem", () => {
  it("scores a downtown product deal", () => {
    expect(scoreNewsItem(item("[Canada Computers] Example M27X $999 – in store Toronto"), [mon, spk])).toEqual({
      score: 14,
      matchedProductIds: [mon.id],
      tags: ["product", "monitor", "toronto"],
    });
  });

  it("matches model numbers written with hyphens", () => {
    expect(scoreNewsItem(item("Example S-50 speakers $199"), [mon, spk])).toEqual({
      score: 13,
      matchedProductIds: [spk.id],
      tags: ["product", "speaker"],
    });
  });

  it("ranks a Toronto in-store deal from a watched store above unrelated posts", () => {
    expect(scoreNewsItem(item("[CPU] IN-STORE ONLY - AMD Ryzen 7 9800X3D [$560][Canada Computers]"), [mon, spk])).toEqual({
      score: 4,
      matchedProductIds: [],
      tags: ["toronto"],
    });
  });

  it("gives unrelated deals no score", () => {
    expect(scoreNewsItem(item("[Costco] Diaper Genie refill $21.99"), [mon, spk])).toEqual({ score: 0, matchedProductIds: [], tags: [] });
  });
});
