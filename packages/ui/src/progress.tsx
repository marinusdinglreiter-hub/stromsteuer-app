import * as React from "react";

import { cn } from "./lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number;
  tone?: "primary" | "success";
  label?: string;
}

/** Schmaler Fortschrittsbalken, z. B. fuer die zwei Spuren der Statusseite. */
function Progress({ value, tone = "primary", label, className, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full",
        tone === "success" ? "bg-success-soft" : "bg-secondary",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          tone === "success" ? "bg-success" : "bg-primary",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
