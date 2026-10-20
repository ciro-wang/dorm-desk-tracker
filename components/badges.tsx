import { BADGE_LABELS, type BadgeKind } from "@/lib/badges";

const TONE: Partial<Record<BadgeKind, string>> = {
  target_reached: "border-sage/40 text-sage",
  pickup_downtown: "border-sage/40 text-sage",
  inflated_was: "border-clay/50 text-clay",
  needs_verification: "border-oak/40 text-oak",
};

export function Badges({ kinds }: { kinds: BadgeKind[] }) {
  if (!kinds.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {kinds.map((k) => (
        <li key={k} className={`rounded border px-2 py-0.5 text-[11px] tracking-wide ${TONE[k] ?? "border-border text-muted-foreground"}`}>
          {BADGE_LABELS[k]}
        </li>
      ))}
    </ul>
  );
}
