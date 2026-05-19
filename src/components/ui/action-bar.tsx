import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Sticky bottom action bar used by request/booking flows. Sits above the
// BottomNav (which is fixed at z-50) so primary actions are always reachable.
export function ActionBar({
  children,
  className,
  hint,
}: {
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[68px] z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl",
        className,
      )}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="mx-auto flex max-w-screen-md flex-col gap-2 px-4 py-3">
        {hint && (
          <div className="text-xs font-medium text-muted-foreground">{hint}</div>
        )}
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}