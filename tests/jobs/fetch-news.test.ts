import { describe, expect, it } from "vitest";
import { runFetchNews } from "@/lib/jobs/fetch-news";
import type { NewsItemInput } from "@/lib/types";
import { FakeRepo } from "../helpers/fake-repo";
import { monitor } from "../helpers/factories";

const mon = monitor();
const n = (id: string, title: string): NewsItemInput => ({ source: "rfd", sourceId: id, title, url: `https://x/${id}`, publishedAt: "2026-11-27T12:00:00Z", excerpt: "" });

describe("runFetchNews", () => {
  it("scores and stores items and survives a failing source", async () => {
    const repo = new FakeRepo([mon], [], []);
    const counts = await runFetchNews({
      repo,
      now: () => new Date("2026-11-27T12:00:00Z"),
      fetchers: [
        async () => [n("1", "Example M27X $999"), n("2", "Diapers")],
        async () => {
          throw new Error("blocked");
        },
      ],
    });
    expect(counts).toEqual({ fetched: 2, inserted: 2, failedSources: 1 });
    expect(repo.news.find((x) => x.sourceId === "1")).toMatchObject({ score: 10, matchedProductIds: [mon.id] });
    expect(repo.jobRuns[0]).toMatchObject({ job: "fetch-news", ok: 1, failed: 1 });
  });

  it("does not insert duplicates", async () => {
    const repo = new FakeRepo([mon], [], []);
    const fetchers = [async () => [n("1", "x")]];
    await runFetchNews({ repo, fetchers, now: () => new Date() });
    expect((await runFetchNews({ repo, fetchers, now: () => new Date() })).inserted).toBe(0);
  });
});
