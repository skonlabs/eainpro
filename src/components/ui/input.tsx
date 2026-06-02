import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, onPaste, min, ...props }, ref) => {
    // Globally block negative numbers across the site: prevent typing
    // the minus sign, "e"/"E" exponents, and pasting negative values
    // into any numeric input.
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
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
