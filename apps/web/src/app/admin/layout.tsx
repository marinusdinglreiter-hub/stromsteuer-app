import { Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND } from "@/config/brand";

/**
 * Backoffice-Layout — eigenes Header-Branding, dunkel-akzentuiert,
 * keine Marketing- oder Wizard-Elemente.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="container flex h-14 items-center justify-between">
          <Link
            href="/admin/eingang"
            className="inline-flex items-center gap-2 text-sm font-semibold"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            Backoffice — {BRAND.kanzlei.name}
          </Link>
          <nav className="flex items-center gap-4 text-xs text-slate-300">
            <Link href="/admin/eingang" className="hover:text-white">
              Eingang
            </Link>
            <Link href="/admin/eingang?status=APPROVED" className="hover:text-white">
              Bewilligt
            </Link>
            <Link href="/admin/eingang?status=PAID" className="hover:text-white">
              Ausgezahlt
            </Link>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
              {BRAND.shortName}
            </span>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
