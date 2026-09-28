import { Landmark } from "lucide-react";

import { BRAND } from "@/config/brand";

/** Zeigt, wer den Antrag einreicht. Keine Erfolgszusage (docs/10). */
export function AnwaltKarte() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        <Landmark className="h-5 w-5" aria-hidden />
      </span>
      <div className="text-sm">
        <div className="font-medium text-ink">
          Einreichung durch {BRAND.kanzlei.name}
        </div>
        <p className="mt-0.5 text-muted-foreground">
          Die Kanzlei reicht Ihren Antrag als Bevollmächtigte im Zoll-Portal
          ein und rechnet ihre Vertretung separat ab.
        </p>
      </div>
    </div>
  );
}
