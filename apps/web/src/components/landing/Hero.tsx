import { Calendar, Check, Clock } from "lucide-react";
import Link from "next/link";

import { aktuellesAntragsjahr, fristDatum } from "@/config/antrag";
import { BRAND } from "@/config/brand";

import { Calculator } from "./Calculator";

const ANTRAGSJAHR_CURRENT = aktuellesAntragsjahr();
const FRIST_TEXT = `Frist: ${fristDatum(ANTRAGSJAHR_CURRENT)} für Verbrauchsjahr ${ANTRAGSJAHR_CURRENT}`;

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white">
      <div className="container grid items-start gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Holen Sie sich{" "}
            <span className="text-blue-700">98 %</span> Ihrer Stromsteuer
            zurück.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 lg:text-lg">
            Den § 9b-Antrag stellen Sie komplett online, ohne Zollportal, ohne
            Papierkram. Produzierende Unternehmen holen sich 2,00 ct/kWh zurück,
            jedes Jahr. In unter 10 Minuten beantragt, erfolgsbasiert und
            anwaltlich abgesichert.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <Calendar className="h-4 w-4" />
            <span>{FRIST_TEXT}</span>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/antrag/start"
              className="inline-flex items-center justify-center rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-800"
            >
              Online-Antrag starten →
            </Link>
            <span className="text-sm text-slate-500">
              Kostenlos · unverbindlich · in 10 Min, kein Termin.
            </span>
          </div>

          <ComparisonBox />

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> 100 % erfolgsabhängig
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> Kein Risiko
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> Geprüft von{" "}
              {BRAND.kanzlei.anwalt}
            </span>
          </div>
        </div>

        <div className="lg:pt-2">
          <Calculator />
        </div>
      </div>
    </section>
  );
}

function ComparisonBox() {
  return (
    <div className="mt-6 inline-flex divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 text-slate-500">
        <Clock className="h-4 w-4" />
        <div>
          <div className="text-xs uppercase tracking-wide">
            Selbst im Zollportal
          </div>
          <div className="font-medium text-slate-700">~4 Stunden</div>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-blue-50 px-4 py-3 text-blue-900">
        <Clock className="h-4 w-4" />
        <div>
          <div className="text-xs uppercase tracking-wide">Mit uns</div>
          <div className="font-semibold">10 Minuten</div>
        </div>
      </div>
    </div>
  );
}
