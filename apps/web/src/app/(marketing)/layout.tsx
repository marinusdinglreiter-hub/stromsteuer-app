import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";

const NAV = [
  { href: "/#ablauf", label: "So funktioniert's" },
  { href: "/#preise", label: "Preise" },
  { href: "/#fristen", label: "Fristen" },
  { href: "/#faq", label: "FAQ" },
];

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-16 items-center justify-between gap-6">
          <Logo />
          <nav
            aria-label="Hauptnavigation"
            className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/#rechner"
            className="hidden h-9 items-center whitespace-nowrap rounded-md bg-primary px-4 text-sm sm:inline-flex font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Anspruch prüfen
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted">
        <div className="container grid gap-8 py-12 text-sm sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-muted-foreground">
              Aufbereitung von Anträgen auf Stromsteuer-Entlastung nach § 9b
              StromStG. Wir leisten keine Steuerberatung. Die Einreichung im
              Zoll-Portal übernimmt {BRAND.kanzlei.name} als bevollmächtigte
              Kanzlei.
            </p>
          </div>
          <div>
            <div className="font-medium text-ink">Rechtliches</div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link href="/impressum" className="hover:text-ink">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="hover:text-ink">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/agb" className="hover:text-ink">
                  AGB
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-ink">Kontakt</div>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <a
                  href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
                  className="tnum hover:text-ink"
                >
                  {BRAND.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${BRAND.email}`} className="hover:text-ink">
                  {BRAND.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="container border-t border-border py-5 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}
        </div>
      </footer>
    </div>
  );
}
