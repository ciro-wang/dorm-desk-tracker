import { verifyCronToken } from "@/lib/auth/cron-token";
import { createServiceClient } from "@/lib/db/server";
import { supabaseRepo } from "@/lib/db/supabase-repo";
import { runFetchNews } from "@/lib/jobs/fetch-news";
import { DEFAULT_SUBREDDITS, fetchSubreddit } from "@/lib/news/reddit";
import { fetchRfdHotDeals } from "@/lib/news/rfd";

export const maxDuration = 60;

/** Manual "refresh news" trigger. Scheduled fetches run in GitHub Actions (scripts/fetch-news.ts). */
export async function POST(request: Request) {
  if (!verifyCronToken(request.headers.get("authorization"), process.env.CRON_TOKEN)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const counts = await runFetchNews({
    repo: supabaseRepo(createServiceClient()),
    fetchers: [fetchRfdHotDeals, ...DEFAULT_SUBREDDITS.map((s) => () => fetchSubreddit(s))],
    now: () => new Date(),
  });
  return Response.json({ ok: true, counts });
}
