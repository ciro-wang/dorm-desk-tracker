export type ChartRow = { date: string; best: number } & Record<string, number | string>;

/** Rows from listing_daily_best (already Toronto days, countable prices only) → one chart row per day, in dollars. */
export function buildChartSeries(rows: { day: string; merchantSlug: string; cents: number }[]): ChartRow[] {
  const byDay = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const day = byDay.get(r.day) ?? new Map<string, number>();
    day.set(r.merchantSlug, Math.min(day.get(r.merchantSlug) ?? Infinity, r.cents));
    byDay.set(r.day, day);
  }
  return [...byDay.keys()].sort().map((date) => {
    const stores = byDay.get(date)!;
    const row: ChartRow = { date, best: Math.min(...stores.values()) / 100 };
    for (const [slug, cents] of stores) row[slug] = cents / 100;
    return row;
  });
}
