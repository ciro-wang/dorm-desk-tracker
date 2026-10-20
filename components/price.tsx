import { formatCad } from "@/lib/money";

export function Price({ cents, className }: { cents: number; className?: string }) {
  return <span className={`tabular-nums ${className ?? ""}`}>{formatCad(cents)}</span>;
}

export function Change({ cents }: { cents: number | null }) {
  if (cents == null || cents === 0) return <span className="text-muted-foreground">no change vs last week</span>;
  const down = cents < 0;
  return (
    <span className={down ? "text-sage" : "text-clay"}>
      {down ? "▼" : "▲"} {formatCad(Math.abs(cents))} vs last week
    </span>
  );
}
