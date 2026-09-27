import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "./lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
        info: "bg-secondary text-primary",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning-foreground",
        danger: "bg-destructive-soft text-destructive",
        solid: "bg-ink text-ink-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
