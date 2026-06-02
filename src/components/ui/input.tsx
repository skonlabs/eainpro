import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, onPaste, onChange, min, ...props }, ref) => {
    // Globally block negative numbers across the site for numeric inputs:
    // block keystrokes, paste, and sanitize the value on change (covers
    // mobile keyboards / autofill where keydown may not fire).
    const isNumeric = type === "number";
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        min={isNumeric && min === undefined ? 0 : min}
        onKeyDown={(e) => {
          if (isNumeric && (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+")) {
            e.preventDefault();
          }
          onKeyDown?.(e);
        }}
        onPaste={(e) => {
          if (isNumeric) {
            const text = e.clipboardData.getData("text");
            if (/[-eE+]/.test(text) || Number(text) < 0) {
              e.preventDefault();
            }
          }
          onPaste?.(e);
        }}
        onChange={(e) => {
          if (isNumeric) {
            const v = e.currentTarget.value;
            const cleaned = v.replace(/[-+eE]/g, "");
            if (cleaned !== v) {
              e.currentTarget.value = cleaned;
            }
            if (cleaned !== "" && Number(cleaned) < 0) {
              e.currentTarget.value = "0";
            }
          }
          onChange?.(e);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
