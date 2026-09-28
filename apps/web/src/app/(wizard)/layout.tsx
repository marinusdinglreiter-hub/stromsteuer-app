import { CalendarClock, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";
import { formatDatum, stichtage } from "@/config/fristen";

/**
 * Wizard-Layout — schlanker als das Marketing-Layout: Logo, Frist und
 * Kontakt oben, keine Navigation, kein Footer. Fokus auf den Antrags-Flow.
 */
export default function WizardLayout({ children }: { children: ReactNode }) {
  const s = stichtage();

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <header className="border-b border-border bg-background">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="hidden items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 font-medium text-warning-foreground md:inline-flex">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Frist {s.verbrauchsjahr}: {formatDatum(s.ausschlussfrist)}
            </span>
            <a
              href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
              className="tnum inline-flex h-9 min-w-9 items-center justify-center gap-1.5 hover:text-ink sm:min-w-0"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only sm:not-sr-only">{BRAND.phone}</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
