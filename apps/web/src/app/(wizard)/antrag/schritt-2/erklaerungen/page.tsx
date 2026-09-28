import { AlertTriangle, ClipboardCheck } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Stepper } from "@/components/wizard/Stepper";
import {
  TriageForm,
  type TriageInitial,
} from "@/components/wizard/TriageForm";
import { SESSION_COOKIE_NAME } from "@/server/session";
import { getServerCaller } from "@/server/trpc";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { error?: string };
};

export default async function ErklaerungenPage({ searchParams }: Props) {
  const cookieStore = cookies();
  if (!cookieStore.get(SESSION_COOKIE_NAME)?.value) {
    redirect("/antrag/start");
  }

  const caller = await getServerCaller();
  const application = await caller.application.current();
  const lieferstellen = application.lieferstellen;

  if (lieferstellen.length === 0) {
    redirect("/antrag/schritt-2/lieferstellen?error=Bitte%20zuerst%20Lieferstellen%20erfassen.");
  }

  const initial: TriageInitial = {
    kleinsteRechtsperson: application.triageKleinsteRechtsperson,
    keineFinanzschwierig: application.triageKeineFinanzschwierig,
    keineEuRueckforderung: application.triageKeineEuRueckforderung,
    privatnutzung: application.triagePrivatnutzung,
    privatnutzungKwh: application.triagePrivatnutzungKwh,
    eAutoLaden: application.triageEAutoLaden,
    eAutoKwh: application.triageEAutoKwh,
    energieAnDritte: application.triageEnergieAnDritte,
  };

  const errorMessage = searchParams?.error;

  return (
    <>
      <Stepper current="pruefen" />

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft text-warning-foreground">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground">
              Sechs kurze Erklärungen
            </h1>
            <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
              Pflichtangaben für das Hauptzollamt. Tooltip-Symbole erläutern
              jede Frage. Bei „Privatnutzung" oder „E-Autos = Ja" geben Sie eine
              Schätzung an — die Software berechnet nichts für Sie.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-4 inline-flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {decodeURIComponent(errorMessage)}
            </div>
          ) : null}

          <div className="mt-6">
            <TriageForm initial={initial} />
          </div>
        </div>
      </div>
    </>
  );
}
