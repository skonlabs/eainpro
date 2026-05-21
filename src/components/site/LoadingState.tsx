import { Loader2 } from "lucide-react";

/**
 * Centered loading indicator used across pages while data loads.
 * Replaces ad-hoc "Loading…" text for a consistent UX.
 */
export function LoadingState({
  label = "Loading…",
  className = "",
}: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground ${className}`}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function InlineLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}