import { Calendar, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND } from "@/config/brand";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header>
        {/* Utility-Bar */}
        <div className="border-b border-slate-100 bg-white">
          <div className="container flex h-14 items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base font-bold text-slate-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-700 text-white">
                <Zap className="h-4 w-4" />
              </span>
              {BRAND.shortName}
            </Link>
            <nav className="flex items-center gap-5 text-sm text-slate-600">
              <Link href="/partner" className="hover:text-slate-900">
                Partner werden
              </Link>
              <span className="text-slate-400">DE</span>
            </nav>
          </div>
        </div>

        {/* GWh-Sales-Strip */}
        <div className="bg-slate-900 text-white">
          <div className="container flex flex-col items-center gap-2 py-2 text-center text-sm sm:flex-row sm:justify-center sm:gap-4">
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <Zap className="h-4 w-4" />
              Über 1 GWh Stromverbrauch im Jahr?
            </span>
            <span className="text-slate-200">
              Persönliche Spezialisten-Betreuung statt Online-Antrag.
            </span>
            <Link
              href="/termin"
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
            >
              <Calendar className="h-3.5 w-3.5" />
              15-Min-Erstgespräch buchen
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-100 bg-slate-50 py-10 text-sm text-slate-500">
        <div className="container grid gap-6 sm:grid-cols-3">
          <div>
            <div className="font-semibold text-slate-900">{BRAND.name}</div>
            <p className="mt-2 text-xs">
              Antragsvorbereitung nach § 9b StromStG. Anwaltliche Einreichung
              durch {BRAND.kanzlei.name}.
            </p>
          </div>
          <div className="text-xs">
            <div className="font-medium text-slate-700">Rechtliches</div>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/impressum" className="hover:text-slate-900">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:text-slate-900">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/agb" className="hover:text-slate-900">
                  AGB
                </Link>
              </li>
            </ul>
          </div>
          <div className="text-xs">
            <div className="font-medium text-slate-700">Kontakt</div>
            <ul className="mt-2 space-y-1">
              <li>{BRAND.phone}</li>
              <li>{BRAND.email}</li>
            </ul>
          </div>
        </div>
        <div className="container mt-8 text-xs text-slate-400">
          © {new Date().getFullYear()} {BRAND.name}
        </div>
      </footer>
    </div>
  );
}
