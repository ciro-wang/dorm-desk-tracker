import { daysBetween, torontoDate } from "@/lib/time";

export interface HistoryStats {
  allTimeLowCents: number | null;
  typical30dCents: number | null;
  max60dCents: number | null;
  historyDays: number;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function historyStats(points: { at: Date; cents: number }[], now: Date): HistoryStats {
  if (!points.length) return { allTimeLowCents: null, typical30dCents: null, max60dCents: null, historyDays: 0 };

  const dailyMin = new Map<string, { at: Date; cents: number }>();
  for (const p of points) {
    const day = torontoDate(p.at);
    const cur = dailyMin.get(day);
    if (!cur || p.cents < cur.cents) dailyMin.set(day, p);
  }
  const days = [...dailyMin.values()];
  const within = (n: number) => days.filter((d) => daysBetween(d.at, now) < n).map((d) => d.cents);
  const last30 = within(30);
  const last60 = within(60);
  const first = points.reduce((a, b) => (a.at < b.at ? a : b));

  return {
    allTimeLowCents: Math.min(...days.map((d) => d.cents)),
    typical30dCents: median(last30),
    max60dCents: last60.length ? Math.max(...last60) : null,
    historyDays: daysBetween(first.at, now),
  };
}
