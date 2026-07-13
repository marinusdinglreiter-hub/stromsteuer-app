"use client";

import { calculateErstattung } from "@stromsteuer/api/calc";
import { Button } from "@stromsteuer/ui/button";
import { TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  KWH_DEFAULT,
  KWH_SLIDER_MAX,
  KWH_STEP,
  MINDEST_KWH_WIRTSCHAFTLICH,
} from "@/config/antrag";
import { BRANCHEN, DEFAULT_BRANCHE } from "@/data/branchen";
import {
  formatEurRund,
  formatKwh,
  wochenKostenloserStrom,
} from "@/lib/format";

const SLIDER_MIN = MINDEST_KWH_WIRTSCHAFTLICH;
const SLIDER_MAX = KWH_SLIDER_MAX;
const SLIDER_STEP = KWH_STEP;
const DEFAULT_KWH = KWH_DEFAULT;

export function Calculator() {
  const [branche, setBranche] = useState(DEFAULT_BRANCHE);
  const [kwh, setKwh] = useState(DEFAULT_KWH);

  const calc = useMemo(() => calculateErstattung({ bruttoKwh: kwh }), [kwh]);
  const wochen = useMemo(
    () => wochenKostenloserStrom(kwh, calc.nettoAuszahlung),
    [kwh, calc.nettoAuszahlung],
  );

  const istWirtschaftlich = kwh >= MINDEST_KWH_WIRTSCHAFTLICH;

  // /antrag/start legt eine Application an, setzt den Session-Cookie und
  // redirected dann auf /antrag/schritt-1. Direkt-Aufruf von /antrag/schritt-1
  // ohne Cookie wuerde sonst auf /antrag/start zurueckspringen.
  const ctaHref = `/antrag/start?kwh=${kwh}&branche=${branche}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg lg:p-7">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-slate-900">
            Erstattungsrechner
          </div>
          <div className="text-xs text-slate-500">
            Ihr Ergebnis in Sekunden
          </div>
        </div>
      </div>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          Branche
        </span>
        <select
          value={branche}
          onChange={(event) => setBranche(event.target.value)}
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {BRANCHEN.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-5">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Ihr jährlicher Stromverbrauch
        </label>
        <div className="relative">
          <input
            type="number"
            value={kwh}
            min={0}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            onChange={(event) =>
              setKwh(Math.max(0, Number(event.target.value) || 0))
            }
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 pr-14 text-right text-base font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
            kWh
          </span>
        </div>
        <input
          type="range"
          value={Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, kwh))}
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          onChange={(event) => setKwh(Number(event.target.value))}
          className="mt-3 w-full accent-blue-600"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{formatKwh(SLIDER_MIN)}</span>
          <span>{formatKwh(SLIDER_MAX)}</span>
        </div>
      </div>

      <div className="mb-5 rounded-xl bg-slate-50 p-5 text-center">
        {istWirtschaftlich ? (
          <>
            <div className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Ihre Nettoerstattung
            </div>
            <div className="my-2 text-4xl font-bold text-slate-900 lg:text-5xl">
              {formatEurRund(calc.nettoAuszahlung)}
            </div>
            <div className="text-xs text-slate-500">
              nach Erfolgshonorar — nur bei Erfolg
            </div>
            {wochen > 0 ? (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Zap className="h-3.5 w-3.5" />
                entspricht etwa <strong>{wochen} Wochen</strong> kostenlosem
                Strom
              </div>
            ) : null}
          </>
        ) : (
          <div className="py-3">
            <div className="text-sm font-medium text-slate-700">
              Verbrauch unter wirtschaftlicher Schwelle
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Erst ab {formatKwh(MINDEST_KWH_WIRTSCHAFTLICH)} pro Jahr lohnt
              sich ein Antrag spürbar (250 € Sockel + Honorar-Floor).
            </div>
          </div>
        )}
      </div>

      <Button
        asChild
        size="lg"
        className="w-full bg-blue-700 text-white hover:bg-blue-800"
        disabled={!istWirtschaftlich}
      >
        <Link href={ctaHref}>Online-Antrag starten →</Link>
      </Button>
      <p className="mt-2 text-center text-xs text-slate-500">
        Kostenlos und unverbindlich. In wenigen Minuten fertig.
      </p>
    </div>
  );
}
