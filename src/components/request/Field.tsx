import { ReactNode } from "react";

export function FieldLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`text-[11px] font-medium uppercase tracking-[0.12em] leading-none text-muted-foreground ${className}`}
    >
      {children}
    </div>
  );
}

export function FieldValue({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mt-2 text-sm font-medium leading-snug text-foreground ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      <FieldValue>{children}</FieldValue>
    </div>
  );
}