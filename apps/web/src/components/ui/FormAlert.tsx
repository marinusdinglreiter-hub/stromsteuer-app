import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "error" | "warning" | "info" | "success";

const STYLES: Record<Variant, { box: string; icon: typeof Info }> = {
  error: { box: "border-red-200 bg-red-50 text-red-700", icon: XCircle },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertTriangle },
  info: { box: "border-slate-200 bg-slate-50 text-slate-600", icon: Info },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
};

/**
 * Einheitliche Hinweis-/Fehlerbox fuer Formulare. Loest den frueheren Mix aus
 * Ad-hoc-Boxen und rohem <pre> ab. `items` rendert eine strukturierte Liste
 * (z. B. mehrere Upload-Fehler); `children` rendert freien Inhalt.
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
  const { box, icon: Icon } = STYLES[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex gap-2 rounded-md border px-3 py-2 text-sm ${box} ${className ?? ""}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
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
      </div>
    </div>
  );
}
