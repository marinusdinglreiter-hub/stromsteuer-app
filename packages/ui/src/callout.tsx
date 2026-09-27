import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import { cn } from "./lib/utils";

const calloutVariants = cva("flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm", {
  variants: {
    variant: {
      neutral: "border-border bg-muted text-muted-foreground",
      info: "border-primary/20 bg-secondary text-ink",
      success: "border-success/25 bg-success-soft text-success",
      warning: "border-warning/30 bg-warning-soft text-warning-foreground",
      danger: "border-destructive/25 bg-destructive-soft text-destructive",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const ICONS: Record<string, LucideIcon> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export type CalloutVariant = NonNullable<
  VariantProps<typeof calloutVariants>["variant"]
>;

export interface CalloutProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof calloutVariants> {
  title?: React.ReactNode;
  /** `false` blendet das Icon aus. */
  icon?: LucideIcon | false;
}

/**
 * Hinweisbox. Farbe folgt der Bedeutung: warning fuer Fristen und
 * Unsicherheit, danger fuer Fehler, success fuer Erledigtes.
 */
function Callout({
  className,
  variant,
  title,
  icon,
  children,
  role,
  ...props
}: CalloutProps) {
  const Icon = icon === false ? null : (icon ?? ICONS[variant ?? "info"]);
  return (
    <div
      role={role ?? (variant === "danger" ? "alert" : "status")}
      className={cn(calloutVariants({ variant }), className)}
      {...props}
    >
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
      <div className="min-w-0 flex-1">
        {title ? <div className="font-medium">{title}</div> : null}
        {children ? (
          <div className={cn(title ? "mt-0.5" : undefined, "[&_a]:underline")}>
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { Callout, calloutVariants };
