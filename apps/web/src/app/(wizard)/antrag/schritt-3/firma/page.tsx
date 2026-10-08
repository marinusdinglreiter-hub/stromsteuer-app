import { Building2 } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  FirmaForm,
  type FirmaInitial,
} from "@/components/wizard/FirmaForm";
import { Stepper } from "@/components/wizard/Stepper";
import { SESSION_COOKIE_NAME } from "@/server/session";
import { getServerCaller } from "@/server/trpc";

export const dynamic = "force-dynamic";

export default async function FirmaPage() {
  const cookieStore = cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)?.value) {
    redirect("/antrag/start");
  }

  const caller = await getServerCaller();
  const application = await caller.application.current();

  // Triage muss durch sein, sonst zurueck.
  if (application.triageKleinsteRechtsperson === null) {
    redirect("/antrag/schritt-2/erklaerungen?error=Bitte%20zuerst%20die%20Erklaerungen%20beantworten.");
  }

  // Firmenname vorbefuellen aus Lieferstelle 1, falls noch leer.
  const m = application.mandant;
  const fallbackFirmenname =
    m?.firmenname ?? application.lieferstellen[0]?.firmenname ?? "";

  const initial: FirmaInitial = {
    firmenname: fallbackFirmenname,
    rechtsform: m?.rechtsform ?? "GmbH",
    geschaeftsfuehrer: m?.geschaeftsfuehrer ?? "",
    vorname: m?.vorname ?? "",
    nachname: m?.nachname ?? "",
    telefon: m?.telefon ?? "",
    strasse: m?.strasse ?? "",
    plz: m?.plz ?? "",
    ort: m?.ort ?? "",
    unternehmensart: m?.unternehmensart ?? "",
    steuernummer: m?.steuernummer ?? "",
    ustIdNr: m?.ustIdNr ?? "",
    handelsregister: m?.handelsregister ?? "",
    wzCode: m?.wzCode ?? "",
    hauptzollamt: m?.hauptzollamt ?? "",
    kontoinhaber: m?.kontoinhaber ?? fallbackFirmenname,
    iban: m?.iban ?? "",
    bic: m?.bic ?? "",
  };

  return (
    <>
      <Stepper current="unterschreiben" />
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground">
              Fast geschafft: Ihre Firmendaten
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Noch dieser Schritt und die Vollmacht, dann reichen wir Ihren
              Antrag ein.
            </p>
          </div>
          <div className="mt-6">
            <FirmaForm initial={initial} />
          </div>
        </div>
      </div>
    </>
  );
}
