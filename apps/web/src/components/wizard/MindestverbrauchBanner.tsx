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
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {anzahlLieferstellen === 1
            ? "1 Lieferstelle"
            : `${anzahlLieferstellen} Lieferstellen`}{" "}
          · Antragsjahr {antragsjahr}
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
          {formatKwh(summe)}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">
          Mindestverbrauch (wirtschaftlich)
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-slate-500">
          {formatKwh(SCHWELLE_KWH)}
        </div>
      </div>
      <div
        className={
          erfuellt
            ? "flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800"
            : "flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900"
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
