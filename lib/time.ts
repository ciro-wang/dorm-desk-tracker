const torontoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date in Toronto as YYYY-MM-DD. */
export function torontoDate(d: Date): string {
  return torontoDay.format(d);
}

/** Whole calendar days between two Toronto dates (b - a). */
export function daysBetween(a: Date, b: Date): number {
  const toUtc = (s: string) => Date.parse(`${s}T00:00:00Z`);
  return Math.round((toUtc(torontoDate(b)) - toUtc(torontoDate(a))) / 86_400_000);
}

export function timeAgo(iso: string, now: Date): string {
  const mins = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
