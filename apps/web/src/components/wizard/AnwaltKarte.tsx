import { CheckCircle2, User } from "lucide-react";

import { BRAND } from "@/config/brand";

export function AnwaltKarte() {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">
            Juristisch geprüft von {BRAND.kanzlei.anwalt}
          </div>
          <div className="text-xs text-slate-500">{BRAND.kanzlei.name}</div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Bei Ablehnung zahlen Sie 0 €. Kein Risiko.
          </div>
        </div>
      </div>
    </div>
  );
}
