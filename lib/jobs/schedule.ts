import { torontoDate } from "@/lib/time";

/** Sale windows in Toronto calendar dates, inclusive. */
export const SALE_WINDOWS: [string, string][] = [
  ["2026-11-20", "2026-12-02"],
  ["2026-12-20", "2027-01-03"],
];

export function isInSaleWindow(now: Date): boolean {
  const day = torontoDate(now);
  return SALE_WINDOWS.some(([from, to]) => day >= from && day <= to);
}

const OFF_PEAK_INTERVAL_MS = 3 * 3600_000;
const SLACK_MS = 5 * 60_000;

/** In a sale window every scheduled run checks; otherwise only every ~3 hours. */
export function shouldRunNow(now: Date, lastRunAt: Date | null): boolean {
  if (isInSaleWindow(now) || !lastRunAt) return true;
  return now.getTime() - lastRunAt.getTime() >= OFF_PEAK_INTERVAL_MS - SLACK_MS;
}
