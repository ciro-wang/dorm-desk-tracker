/**
 * Scheduled price check (GitHub Actions). Prints counts only: Actions logs are public.
 *
 *   npx tsx --env-file=.env.local scripts/check-prices.ts [--force]
 */
import { ntfyNotifier, type Notifier } from "@/lib/alerts/ntfy";
import { createServiceClient } from "@/lib/db/server";
import { supabaseRepo } from "@/lib/db/supabase-repo";
import { CHECK_PRICES_JOB, runCheckPrices } from "@/lib/jobs/check-prices";
import { shouldRunNow } from "@/lib/jobs/schedule";
import { getAdapter } from "@/lib/scraper/registry";

const silentNotifier: Notifier = { send: async () => {} };

async function main() {
  const repo = supabaseRepo(createServiceClient());
  const now = new Date();
  if (!process.argv.includes("--force") && !shouldRunNow(now, await repo.lastJobRun(CHECK_PRICES_JOB))) {
    console.log("skipped: outside sale window and checked recently");
    return;
  }
  const topic = process.env.NTFY_TOPIC_URL;
  const counts = await runCheckPrices({
    repo,
    getAdapter,
    notify: topic ? ntfyNotifier(topic) : silentNotifier,
    now: () => new Date(),
    appBaseUrl: process.env.APP_BASE_URL ?? "",
  });
  console.log(
    `checked: ${counts.checked}, ok: ${counts.ok}, blocked: ${counts.blocked}, failed: ${counts.failed}, alerts: ${counts.alerts}`,
  );
}

main().catch(() => {
  console.error("check-prices crashed");
  process.exit(1);
});
