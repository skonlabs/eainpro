import { ReactNode } from "react";

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">{label}</div>
      <div className="mt-1.5 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}