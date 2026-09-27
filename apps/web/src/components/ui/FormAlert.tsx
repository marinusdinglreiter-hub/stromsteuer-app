import { Callout, type CalloutVariant } from "@stromsteuer/ui/callout";
import type { ReactNode } from "react";

type Variant = "error" | "warning" | "info" | "success";

const VARIANT: Record<Variant, CalloutVariant> = {
  error: "danger",
  warning: "warning",
  info: "neutral",
  success: "success",
};

/**
 * Einheitliche Hinweis-/Fehlerbox fuer Formulare, gebaut auf `Callout`.
 * `items` rendert eine strukturierte Liste (z. B. mehrere Upload-Fehler);
 * `children` rendert freien Inhalt.
 */
export function FormAlert({
  variant = "error",
  children,
  items,
  className,
}: {
  variant?: Variant;
  children?: ReactNode;
  items?: string[];
  className?: string;
}) {
  return (
    <Callout variant={VARIANT[variant]} className={className}>
      {children}
      {items && items.length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-4">
          {items.map((it, i) => (
            <li key={i} className="break-words">
              {it}
            </li>
          ))}
        </ul>
      ) : null}
    </Callout>
  );
}
