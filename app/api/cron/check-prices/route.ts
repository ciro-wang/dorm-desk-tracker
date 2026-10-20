import { ntfyNotifier } from "@/lib/alerts/ntfy";
import { verifyCronToken } from "@/lib/auth/cron-token";
import { createServiceClient } from "@/lib/db/server";
import { supabaseRepo } from "@/lib/db/supabase-repo";
import { runCheckPrices } from "@/lib/jobs/check-prices";
import { getAdapter } from "@/lib/scraper/registry";

export const maxDuration = 60;

/** Manual "check now" trigger. Scheduled checks run in GitHub Actions (scripts/check-prices.ts). */
export async function POST(request: Request) {
  if (!verifyCronToken(request.headers.get("authorization"), process.env.CRON_TOKEN)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const topic = process.env.NTFY_TOPIC_URL;
  const counts = await runCheckPrices({
    repo: supabaseRepo(createServiceClient()),
    getAdapter,
    notify: topic ? ntfyNotifier(topic) : { send: async () => {} },
    now: () => new Date(),
    appBaseUrl: process.env.APP_BASE_URL ?? "",
    skipBrowser: true,
  });
  return Response.json({ ok: true, counts });
}
