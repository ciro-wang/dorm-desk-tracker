import type { VerdictLevel } from "@/lib/types";

const LABEL: Record<VerdictLevel, string> = {
  all_time_low: "All-time low",
  great: "Great deal",
  target: "At target",
  fair: "Fair price",
  not_a_deal: "Not a deal",
  unknown: "No price",
};

const TONE: Record<VerdictLevel, string> = {
  all_time_low: "bg-sage/20 text-sage ring-sage/40",
  great: "bg-sage/20 text-sage ring-sage/40",
  target: "bg-sage/10 text-sage ring-sage/30",
  fair: "bg-oak/15 text-oak ring-oak/30",
  not_a_deal: "bg-secondary text-stone ring-border",
  unknown: "bg-secondary text-stone ring-border",
};

export function VerdictPill({ level }: { level: VerdictLevel }) {
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONE[level]}`}>{LABEL[level]}</span>;
}
