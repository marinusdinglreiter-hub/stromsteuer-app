import { CalendarClock, Landmark, Receipt, ServerCog } from "lucide-react";
import Link from "next/link";

import { formatDatum, stichtage } from "@/config/fristen";

import { Calculator } from "./Calculator";

export function Hero() {
  const s = stichtage();

  return (
    <section className="border-b border-border bg-muted">
      <div className="container grid items-start gap-10 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning-foreground">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Verbrauchsjahr {s.verbrauchsjahr} · Ausschlussfrist{" "}
            {formatDatum(s.ausschlussfrist)}
          </span>

          <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Stromsteuer-Entlastung nach §&nbsp;9b, sauber aufbereitet und
            fristgerecht eingereicht.
          </h1>

          <p className="mt-5 text-base leading-relaxed text-muted-foreground lg:text-lg">
            Wir erheben Ihre Verbräuche aus den Stromrechnungen und bauen den
            Antrag auf. Eine unabhängige Kanzlei reicht ihn als Ihre
            Bevollmächtigte im Zoll-Portal ein. Sie erhalten zwei Rechnungen,
            beide stehen vorher fest.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="#rechner"
              className="inline-flex h-11 items-center rounded-md bg-primary lg:hidden px-6 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Anspruch kostenlos prüfen
            </Link>
            <Link
              href="#ablauf"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              So läuft es ab
            </Link>
          </div>

          <ul className="mt-10 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-ink" aria-hidden />
              Festpreis nach Verbrauch
            </li>
            <li className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-ink" aria-hidden />
              Einreichung durch Kanzlei
            </li>
            <li className="flex items-center gap-2">
              <ServerCog className="h-4 w-4 text-ink" aria-hidden />
              Daten in der EU
            </li>
          </ul>
        </div>

        <div id="rechner" className="scroll-mt-24">
          <Calculator />
        </div>
      </div>
    </section>
  );
}
