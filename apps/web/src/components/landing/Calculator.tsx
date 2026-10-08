"use client";

import { calculateErstattung, satzFuer } from "@stromsteuer/api/calc";
import { preisFuer } from "@stromsteuer/api/calc/preise";
import { Callout } from "@stromsteuer/ui/callout";
import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { KWH_DEFAULT, KWH_SLIDER_MAX, KWH_STEP } from "@/config/antrag";
import { BRAND } from "@/config/brand";
import { BRANCHEN, DEFAULT_BRANCHE } from "@/data/branchen";
import {
  erstattungNachSelbstbehalt,
  formatEur,
  formatEurRund,
  formatKwh,
} from "@/lib/format";

/**
 * Der Slider laeuft logarithmisch: Das Kernsegment 150–600 MWh soll nicht in
 * den ersten Millimetern verschwinden, wie es bei einer linearen Skala bis
 * 10 GWh der Fall waere.
 */
const SLIDER_MIN_KWH = 50_000;
const SLIDER_STEPS = 1000;

function kwhAusPosition(pos: number): number {
  const kwh = SLIDER_MIN_KWH * (KWH_SLIDER_MAX / SLIDER_MIN_KWH) ** (pos / SLIDER_STEPS);
  return Math.round(kwh / KWH_STEP) * KWH_STEP;
}

function positionAusKwh(kwh: number): number {
  const k = Math.min(KWH_SLIDER_MAX, Math.max(SLIDER_MIN_KWH, kwh));
  return Math.round(
    (Math.log(k / SLIDER_MIN_KWH) / Math.log(KWH_SLIDER_MAX / SLIDER_MIN_KWH)) *
      SLIDER_STEPS,
  );
}

/** Antragsfaehig ist nur das abgeschlossene Vorjahr. */
const VERBRAUCHSJAHR = new Date().getFullYear() - 1;
const SATZ_EUR_PRO_MWH = satzFuer(VERBRAUCHSJAHR).eurProMwh.toLocaleString("de-DE", {
  minimumFractionDigits: 2,
});

export function Calculator() {
  const [branche, setBranche] = useState(DEFAULT_BRANCHE);
  const [kwh, setKwh] = useState(KWH_DEFAULT);
  const kwhId = useId();
  const brancheId = useId();

  const calc = useMemo(() => calculateErstattung({ verbrauchsjahr: VERBRAUCHSJAHR, bruttoKwh: kwh }), [kwh]);
  const erstattung = erstattungNachSelbstbehalt(calc);
  const preis = useMemo(() => preisFuer(calc.nettoKwh / 1000), [calc.nettoKwh]);

  const unterBaendern = preis.band === null;
  const individuell = preis.band !== null && preis.preisEur === null;
  const ctaHref = `/antrag/start?kwh=${kwh}&branche=${branche}`;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(15,43,70,0.06)] sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Ihr Anspruch</h2>
        <span className="text-xs text-muted-foreground">Vorläufige Berechnung</span>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor={brancheId} className="mb-1.5 block text-sm font-medium">
            Branche
          </label>
          <select
            id={brancheId}
            value={branche}
            onChange={(event) => setBranche(event.target.value)}
            className="block h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0"
          >
            {BRANCHEN.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={kwhId} className="mb-1.5 block text-sm font-medium">
            Stromverbrauch pro Jahr
          </label>
          <div className="relative">
            <input
              id={kwhId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={kwh.toLocaleString("de-DE")}
              onChange={(event) => {
                const ziffern = event.target.value.replace(/\D/g, "").slice(0, 9);
                setKwh(Number(ziffern) || 0);
              }}
              className="tnum block h-10 w-full rounded-md border border-input bg-background px-3 pr-14 text-right text-[15px] font-medium focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              kWh
            </span>
          </div>
          <input
            type="range"
            aria-label="Stromverbrauch pro Jahr (Schieberegler)"
            aria-valuetext={formatKwh(kwh)}
            min={0}
            max={SLIDER_STEPS}
            step={1}
            value={positionAusKwh(kwh)}
            onChange={(event) => setKwh(kwhAusPosition(Number(event.target.value)))}
            className="mt-3 w-full accent-[hsl(var(--primary))]"
          />
          <div className="tnum mt-1 flex justify-between text-xs text-muted-foreground">
            <span>50 MWh</span>
            <span>10 GWh</span>
          </div>
        </div>
      </div>

      <dl className="tnum mt-5 divide-y divide-border border-t border-border text-sm">
        <div className="flex justify-between py-2.5">
          <dt className="text-muted-foreground">
            Entlastung ({SATZ_EUR_PRO_MWH} €/MWh)
          </dt>
          <dd>{formatEur(calc.bruttoErstattung)}</dd>
        </div>
        <div className="flex justify-between py-2.5">
          <dt className="text-muted-foreground">Gesetzlicher Selbstbehalt</dt>
          <dd className="text-muted-foreground">− {formatEur(calc.sockel)}</dd>
        </div>
        <div className="flex items-baseline justify-between py-3">
          <dt className="font-medium text-ink">Erstattung an Sie</dt>
          <dd className="text-2xl font-semibold tracking-tight text-success">
            {formatEur(erstattung)}
          </dd>
        </div>
      </dl>

      {unterBaendern ? (
        <Callout variant="neutral" className="mt-2">
          {erstattung <= 0
            ? "Unter 12.500 kWh liegt die Entlastung unter dem Selbstbehalt von 250 €."
            : "Für einen Verbrauch unter 150 MWh bieten wir derzeit keinen Festpreis an, weil der Aufwand im Verhältnis zur Erstattung zu hoch wäre. Schreiben Sie uns, wenn Sie trotzdem Fragen haben."}
        </Callout>
      ) : (
        <div className="mt-2 rounded-lg bg-muted px-4 py-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">
              Unsere Aufbereitung
              {preis.band ? (
                <span className="tnum">
                  {" "}
                  (Band {preis.band.vonMwh.toLocaleString("de-DE")}
                  {preis.band.bisMwh
                    ? `–${preis.band.bisMwh.toLocaleString("de-DE")}`
                    : "+"}{" "}
                  MWh)
                </span>
              ) : null}
            </span>
            <span className="tnum whitespace-nowrap font-medium text-ink">
              {individuell ? "individuelles Angebot" : `${formatEurRund(preis.preisEur ?? 0)} fest`}
            </span>
          </div>
          <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
            <span>Kanzlei für die Einreichung</span>
            <span>eigene Rechnung</span>
          </div>
        </div>
      )}

      {unterBaendern ? (
        <a
          href={`mailto:${BRAND.email}?subject=${encodeURIComponent("Anfrage Stromsteuer-Entlastung")}`}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md border border-input bg-background text-[15px] font-medium text-ink transition-colors hover:bg-muted"
        >
          Anfrage per E-Mail
        </a>
      ) : (
        <Link
          href={ctaHref}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Anspruch kostenlos prüfen
        </Link>
      )}

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Satz und Selbstbehalt nach zoll.de, abgerufen am 16.09.2026. Die
        Berechnung ist unverbindlich; über die Entlastung entscheidet das
        Hauptzollamt. Preise zzgl. USt.
      </p>
    </div>
  );
}
