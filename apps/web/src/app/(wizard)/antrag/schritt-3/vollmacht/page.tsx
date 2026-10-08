import { CONSENT_VERSION } from "@stromsteuer/api";
import { ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Callout } from "@stromsteuer/ui/callout";

import { MandatForm } from "@/components/wizard/MandatForm";
import { BRAND } from "@/config/brand";
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
  const mandant = application.mandant;

  if (!mandant?.firmenname || !mandant.geschaeftsfuehrer || !mandant.iban) {
    redirect("/antrag/schritt-3/firma");
  }
  if (application.triageKleinsteRechtsperson === null) {
    redirect("/antrag/schritt-2/erklaerungen");
  }

  // Kostenlose Vorpruefung vor Vertragsschluss: nicht anspruchsberechtigte
  // Faelle sehen die Begruendung statt eines Vertrags.
  const { ergebnis, berechnung, preis } = await caller.application.vorpruefung();

  return (
    <>
      <Stepper current="unterschreiben" />
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground">
              Letzter Schritt: zwei Verträge unterschreiben
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Wir bereiten Ihre Unterlagen zum Festpreis auf. Die Partnerkanzlei
              stellt den Antrag im Zoll-Portal und rechnet ihre Vertretung selbst ab.
            </p>
          </div>
          <div className="mt-6">
            {ergebnis.status === "hardstop" ? (
              <Callout variant="danger" title="Ein Antrag ist in Ihrem Fall nicht möglich">
                <ul className="list-disc space-y-1 pl-4">
                  {ergebnis.gruende.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
                <p className="mt-2">Es kommt kein Vertrag zustande, Ihnen entstehen keine Kosten.</p>
              </Callout>
            ) : preis.band === null ? (
              <Callout variant="neutral" title="Kein Festpreis für diesen Verbrauch">
                Für unter 150 MWh nach Abzügen bieten wir derzeit keine Aufbereitung an. Schreiben Sie
                uns an {BRAND.email}, wenn Sie Fragen haben.
              </Callout>
            ) : (
              <MandatForm
                consentVersion={CONSENT_VERSION}
                firmenname={mandant.firmenname}
                geschaeftsfuehrer={mandant.geschaeftsfuehrer}
                antragsjahr={application.antragsjahr ?? new Date().getFullYear() - 1}
                erstattung={berechnung.auszahlung}
                preisEur={preis.preisEur}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
