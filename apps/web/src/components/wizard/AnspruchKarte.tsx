import {
  ENTLASTUNGSSATZ_EUR_PRO_KWH,
  SOCKEL_EUR,
  type CalcResult,
} from "@stromsteuer/api";
import { CheckCircle2, Zap } from "lucide-react";

import { formatEur, formatKwh, wochenKostenloserStrom } from "@/lib/format";

type Props = {
  result: CalcResult;
  bruttoKwh: number;
};

export function AnspruchKarte({ result, bruttoKwh }: Props) {
  const wochen = wochenKostenloserStrom(bruttoKwh, result.nettoAuszahlung);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Anspruchsberechtigt
        </span>
        <div className="mt-3 text-sm text-slate-500">
          Ihr Anspruch nach § 9b StromStG
        </div>
        <div className="mt-2 text-5xl font-bold tracking-tight text-slate-900 lg:text-6xl">
          {formatEur(result.nettoAuszahlung)}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          pro Jahr, direkt auf Ihr Firmenkonto
        </div>
        {wochen > 0 ? (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Zap className="h-3.5 w-3.5" />
            entspricht etwa <strong>{wochen} Wochen</strong> kostenlosem Strom
          </div>
        ) : null}
      </div>

      <BerechnungTable result={result} />
    </div>
  );
}

function BerechnungTable({ result }: { result: CalcResult }) {
  const honorarLabel =
    result.honorar > result.bruttoErstattung - SOCKEL_EUR
      ? "Erfolgshonorar"
      : `Erfolgshonorar (${result.honorarSatz.toString().replace(".", ",")} %)`;

  return (
    <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 text-sm">
      <Row label="Ihr Verbrauch" value={formatKwh(result.nettoKwh)} />
      <Row
        label="Erstattungssatz"
        value={`${(ENTLASTUNGSSATZ_EUR_PRO_KWH * 1000).toLocaleString("de-DE")} €/MWh`}
      />
      <Row
        label="Brutto-Erstattung"
        value={formatEur(result.bruttoErstattung)}
      />
      <Row
        label="Gesetzlicher Selbstbehalt (§ 9b)"
        value={`-${formatEur(SOCKEL_EUR)}`}
        negative
      />
      <Row label={honorarLabel} value={`-${formatEur(result.honorar)}`} negative />
      <Row
        label="Ihre Auszahlung"
        value={formatEur(result.nettoAuszahlung)}
        emphasize
      />
    </dl>
  );
}

function Row({
  label,
  value,
  negative,
  emphasize,
}: {
  label: string;
  value: string;
  negative?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt
        className={
          emphasize ? "font-semibold text-slate-900" : "text-slate-600"
        }
      >
        {label}
      </dt>
      <dd
        className={
          emphasize
            ? "text-lg font-bold text-blue-700"
            : negative
              ? "tabular-nums text-slate-500"
              : "tabular-nums text-slate-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}
