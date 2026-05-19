import { cn } from "@/lib/utils";
import type { BookingState } from "@/lib/booking-status";
import { statusMeta } from "@/lib/booking-status";

const TONE: Record<string, string> = {
  pending:
    "bg-[color:var(--status-pending)]/20 text-[color:var(--status-pending-foreground)] ring-1 ring-[color:var(--status-pending)]/30",
  active:
    "bg-[color:var(--status-active)]/20 text-[color:var(--status-active-foreground)] ring-1 ring-[color:var(--status-active)]/30",
  confirmed:
    "bg-[color:var(--status-confirmed)] text-[color:var(--status-confirmed-foreground)]",
  done:
    "bg-[color:var(--status-done)]/20 text-[color:var(--status-done-foreground)] ring-1 ring-[color:var(--status-done)]/30",
  cancelled:
    "bg-[color:var(--status-cancelled)]/20 text-[color:var(--status-cancelled-foreground)] ring-1 ring-[color:var(--status-cancelled)]/30",
};

export function StatusBadge({
  state,
  lang = "en",
  className,
}: {
  state: BookingState;
  lang?: "en" | "my";
  className?: string;
}) {
  const m = statusMeta(state);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        TONE[m.tone],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {lang === "en" ? m.en : m.my}
    </span>
  );
}