import type { Repo } from "@/lib/jobs/repo";
import { scoreNewsItem } from "@/lib/news/relevance";
import type { NewsItemInput } from "@/lib/types";

export const FETCH_NEWS_JOB = "fetch-news";

export async function runFetchNews(deps: {
  repo: Repo;
  fetchers: (() => Promise<NewsItemInput[]>)[];
  now: () => Date;
}): Promise<{ fetched: number; inserted: number; failedSources: number }> {
  const startedAt = deps.now();
  const products = await deps.repo.listActiveProducts();
  const items: NewsItemInput[] = [];
  let failedSources = 0;

  for (const fetcher of deps.fetchers) {
    try {
      items.push(...(await fetcher()));
    } catch {
      failedSources += 1;
    }
  }

  const inserted = await deps.repo.upsertNewsItems(items.map((i) => ({ ...i, ...scoreNewsItem(i, products) })));
  await deps.repo.recordJobRun(FETCH_NEWS_JOB, startedAt, deps.fetchers.length - failedSources, failedSources);
  return { fetched: items.length, inserted, failedSources };
}
