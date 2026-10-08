import type { CalcResult } from "@stromsteuer/api";
import { preisFuer } from "@stromsteuer/api/calc/preise";
import { Badge } from "@stromsteuer/ui/badge";

import {
  erstattungNachSelbstbehalt,
  formatEur,
  formatEurRund,
  formatKwh,
} from "@/lib/format";

type Props = {
  result: CalcResult;
  bruttoKwh: number;
};

/**
 * Vorlaeufige Berechnung im Wizard. Die Software bewertet nicht, ob der
 * Betrieb anspruchsberechtigt ist — das beantwortet der Kunde selbst.
 */
export function AnspruchKarte({ result }: Props) {
  const erstattung = erstattungNachSelbstbehalt(result);
  const preis = preisFuer(result.nettoKwh / 1000);
  const satz = result.satzEurProMwh.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,43,70,0.05)] lg:p-8">
      <div className="text-center">
        <Badge variant="info">Vorläufige Berechnung</Badge>
        <div className="mt-3 text-sm text-muted-foreground">
          Erstattung nach § 9b StromStG
        </div>
        <div className="tnum mt-2 text-4xl font-semibold tracking-tight text-success sm:text-5xl">
          {formatEur(erstattung)}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          pro Verbrauchsjahr, Auszahlung durch das Hauptzollamt
        </div>
      </div>

      <dl className="tnum mt-6 divide-y divide-border rounded-lg border border-border text-sm">
        <Row label="Ihr Verbrauch" value={formatKwh(result.nettoKwh)} />
        <Row label="Entlastungssatz" value={`${satz} €/MWh`} />
        <Row label="Entlastung" value={formatEur(result.bruttoErstattung)} />
        <Row
          label="Gesetzlicher Selbstbehalt"
          value={`− ${formatEur(result.sockel)}`}
          muted
        />
        <Row label="Erstattung an Sie" value={formatEur(erstattung)} emphasize />
      </dl>

      <div className="tnum mt-3 flex items-baseline justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
        <span className="text-muted-foreground">Unsere Aufbereitung (Festpreis)</span>
        <span className="font-medium text-ink">
          {preis.preisEur !== null
            ? formatEurRund(preis.preisEur)
            : preis.band
              ? "individuelles Angebot"
              : "kein Festpreis unter 150 MWh"}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Die Kanzlei stellt ihre Vertretung separat in Rechnung. Preise zzgl. USt.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  emphasize,
}: {
  label: string;
  value: string;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className={emphasize ? "font-medium text-ink" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd
        className={
          emphasize
            ? "text-base font-semibold text-success"
            : muted
              ? "text-muted-foreground"
              : "text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}
