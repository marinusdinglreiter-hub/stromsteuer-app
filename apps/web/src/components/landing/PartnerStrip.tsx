import { BRAND } from "@/config/brand";

/**
 * Vertrauens-Strip mit Partner- und Verbands-Logos.
 * MVP: Text-Stubs. Echte Logos werden spaeter eingebunden, sobald Kooperationen
 * juristisch bestaetigt sind.
 */
export function PartnerStrip() {
  return (
    <section className="border-y border-slate-100 bg-white py-8">
      <div className="container">
        <div className="text-center text-xs font-medium uppercase tracking-widest text-slate-400">
          Partner &amp; Mitgliedschaften
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          <div className="rounded bg-slate-100 px-5 py-3 text-xs font-semibold text-slate-600">
            {BRAND.kanzlei.name}
          </div>
          <div className="rounded bg-slate-100 px-5 py-3 text-xs font-semibold text-slate-600">
            Der Mittelstand. BVMW
          </div>
        </div>
      </div>
    </section>
  );
}
