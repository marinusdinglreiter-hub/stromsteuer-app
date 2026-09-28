import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";

const NAV = [
  { href: "/admin/eingang", label: "Eingang" },
  { href: "/admin/eingang?status=SUBMITTED", label: "Beim HZA" },
  { href: "/admin/eingang?status=APPROVED", label: "Bewilligt" },
  { href: "/admin/eingang?status=PAID", label: "Ausgezahlt" },
];

/**
 * Backoffice-Layout — Kopfleiste in Tinte, dichte Arbeitsflaeche darunter.
 * Keine Marketing- oder Wizard-Elemente.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <header className="bg-ink text-ink-foreground">
        <div className="container flex h-14 items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin/eingang" inverted label="Backoffice" />
            <span className="hidden text-xs text-ink-foreground/60 sm:inline">
              {BRAND.name} · {BRAND.kanzlei.name}
            </span>
          </div>
          <nav
            aria-label="Backoffice"
            className="flex items-center gap-1 overflow-x-auto text-sm"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-ink-foreground/75 transition-colors hover:bg-ink-foreground/10 hover:text-ink-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
