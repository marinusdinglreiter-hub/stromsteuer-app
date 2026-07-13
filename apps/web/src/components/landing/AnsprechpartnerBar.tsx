import { Phone, User } from "lucide-react";

import { BRAND } from "@/config/brand";

export function AnsprechpartnerBar() {
  return (
    <section className="border-b border-slate-100 bg-white py-6">
      <div className="container flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Ihre direkten Ansprechpartner
            </div>
            <div className="text-sm font-medium text-slate-900">
              {BRAND.kanzlei.anwalt} ·{" "}
              <span className="text-slate-500">{BRAND.kanzlei.name}</span>
            </div>
            <div className="text-xs text-slate-500">
              Fragen zu Ihrem Anspruch? Rufen Sie uns an oder buchen Sie einen
              Termin. Kostenlos und unverbindlich.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Phone className="h-4 w-4" />
            {BRAND.phone}
          </a>
        </div>
      </div>
    </section>
  );
}
