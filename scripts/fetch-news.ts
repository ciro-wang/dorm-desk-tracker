/**
 * Scheduled news fetch (GitHub Actions). Prints counts only: Actions logs are public.
 *
 *   npx tsx --env-file=.env.local scripts/fetch-news.ts
 */
import { createServiceClient } from "@/lib/db/server";
import { supabaseRepo } from "@/lib/db/supabase-repo";
import { runFetchNews } from "@/lib/jobs/fetch-news";
import { DEFAULT_SUBREDDITS, fetchSubreddit } from "@/lib/news/reddit";
import { fetchRfdHotDeals } from "@/lib/news/rfd";

async function main() {
  const counts = await runFetchNews({
    repo: supabaseRepo(createServiceClient()),
    fetchers: [fetchRfdHotDeals, ...DEFAULT_SUBREDDITS.map((s) => () => fetchSubreddit(s))],
    now: () => new Date(),
  });
  console.log(`fetched: ${counts.fetched}, inserted: ${counts.inserted}, failedSources: ${counts.failedSources}`);
}

main().catch(() => {
  console.error("fetch-news crashed");
  process.exit(1);
});
