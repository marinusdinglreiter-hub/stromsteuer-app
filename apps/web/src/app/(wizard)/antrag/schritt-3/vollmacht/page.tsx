import { calculateErstattung, CONSENT_VERSION } from "@stromsteuer/api";
import { ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MandatForm } from "@/components/wizard/MandatForm";
import { Stepper } from "@/components/wizard/Stepper";
import { SESSION_COOKIE_NAME } from "@/server/session";
import { getServerCaller } from "@/server/trpc";

export const dynamic = "force-dynamic";

export default async function VollmachtPage() {
  const cookieStore = cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)?.value) {
    redirect("/antrag/start");
  }

  const caller = await getServerCaller();
  const application = await caller.application.current();

  if (!application.firmenname || !application.geschaeftsfuehrer) {
    redirect("/antrag/schritt-3/firma");
  }
  if (application.triageKleinsteRechtsperson === null) {
    redirect("/antrag/schritt-2/erklaerungen");
  }

  // Aktualisierte Berechnung fuer den Display.
  const lieferstellenSumme = application.lieferstellen.reduce(
    (acc, l) => acc + l.jahresKwh,
    0,
  );
  const result = calculateErstattung({
    bruttoKwh: lieferstellenSumme || (application.geschaeftsfuehrer ? 0 : 0),
    privatnutzungKwh: application.triagePrivatnutzungKwh ?? 0,
    eAutoKwh: application.triageEAutoKwh ?? 0,
  });

  return (
    <>
      <Stepper current="unterschreiben" />
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Letzter Schritt: Vollmacht unterschreiben
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Die Partnerkanzlei reicht Ihren Antrag beim Hauptzollamt ein. Sie
              zahlen nur bei Erfolg.
            </p>
          </div>
          <div className="mt-6">
            <MandatForm
              consentVersion={CONSENT_VERSION}
              firmenname={application.firmenname}
              geschaeftsfuehrer={application.geschaeftsfuehrer}
              antragsjahr={
                application.antragsjahr ?? new Date().getFullYear() - 1
              }
              bruttoErstattung={Number(application.bruttoErstattung ?? result.bruttoErstattung)}
              honorar={Number(application.honorar ?? result.honorar)}
              honorarSatz={result.honorarSatz}
              nettoAuszahlung={Number(application.nettoAuszahlung ?? result.nettoAuszahlung)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
