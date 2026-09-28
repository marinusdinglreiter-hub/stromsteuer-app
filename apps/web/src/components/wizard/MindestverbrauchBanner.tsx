import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { MINDEST_KWH_WIRTSCHAFTLICH } from "@/config/antrag";
import { formatKwh } from "@/lib/format";

const SCHWELLE_KWH = MINDEST_KWH_WIRTSCHAFTLICH;

type Props = {
  summe: number;
  antragsjahr: number;
  anzahlLieferstellen: number;
};

export function MindestverbrauchBanner({
  summe,
  antragsjahr,
  anzahlLieferstellen,
}: Props) {
  const erfuellt = summe >= SCHWELLE_KWH;

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {anzahlLieferstellen === 1
            ? "1 Lieferstelle"
            : `${anzahlLieferstellen} Lieferstellen`}{" "}
          · Antragsjahr {antragsjahr}
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {formatKwh(summe)}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Mindestverbrauch (wirtschaftlich)
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-muted-foreground">
          {formatKwh(SCHWELLE_KWH)}
        </div>
      </div>
      <div
        className={
          erfuellt
            ? "flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-success"
            : "flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-warning-foreground"
        }
      >
        {erfuellt ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
        <div className="text-sm font-medium">
          {erfuellt
            ? `Bereit zur Berechnung`
            : `Noch ${formatKwh(SCHWELLE_KWH - summe)} fehlen`}
          <div className="text-xs font-normal">
            {erfuellt
              ? `Sie liegen über ${formatKwh(SCHWELLE_KWH)}`
              : `Wirtschaftlich erst ab ${formatKwh(SCHWELLE_KWH)}`}
          </div>
        </div>
      </div>
    </div>
  );
}
