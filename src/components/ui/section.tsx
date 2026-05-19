import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  action,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-1">
          {title && (
            <h2 className="font-display text-sm font-bold tracking-tight">{title}</h2>
          )}
          {action && <div className="text-xs font-semibold text-primary">{action}</div>}
        </div>
      )}
      <div
        className={cn(
          "rounded-2xl border border-border bg-card shadow-soft",
          padded && "p-4",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}