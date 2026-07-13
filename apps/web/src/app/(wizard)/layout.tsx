import { Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND } from "@/config/brand";

/**
 * Wizard-Layout — schlanker als das Marketing-Layout: Logo + Kontakt oben,
 * keine Navigation, kein Footer-Lärm. Fokus auf den Antrags-Flow.
 */
export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
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
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <a
              href={`mailto:${BRAND.email}`}
              className="hidden hover:text-slate-900 sm:inline"
            >
              {BRAND.email}
            </a>
            <a
              href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
              className="hover:text-slate-900"
            >
              {BRAND.phone}
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-6">{children}</div>
      </main>
    </div>
  );
}
