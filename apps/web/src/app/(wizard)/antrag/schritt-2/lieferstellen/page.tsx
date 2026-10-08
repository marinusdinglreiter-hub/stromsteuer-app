import { Button } from "@stromsteuer/ui/button";
import { AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { weiterZuErklaerungenAction } from "@/app/antrag/schritt-2/actions";
import { MINDEST_KWH_WIRTSCHAFTLICH } from "@/config/antrag";
import { type LieferstelleData } from "@/components/wizard/LieferstelleCard";
import { LieferstellenList } from "@/components/wizard/LieferstellenList";
import { MassenUpload } from "@/components/wizard/MassenUpload";
import { MindestverbrauchBanner } from "@/components/wizard/MindestverbrauchBanner";
import { Stepper } from "@/components/wizard/Stepper";
import { SESSION_COOKIE_NAME } from "@/server/session";
import { getServerCaller } from "@/server/trpc";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: { error?: string };
};

export default async function LieferstellenPage({ searchParams }: PageProps) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    redirect("/antrag/start");
  }

  const caller = await getServerCaller();
  const application = await caller.application.current();
  const lieferstellen = (await caller.lieferstelle.list()) as LieferstelleData[];

  // Wenn Liste leer: einen leeren Eintrag automatisch anlegen, damit der
  // User nicht erst klicken muss.
  let initial: LieferstelleData[] = lieferstellen;
  if (initial.length === 0) {
    const created = await caller.lieferstelle.create();
    initial = [created as LieferstelleData];
  }

  const summe = initial.reduce((acc, l) => acc + l.kwhEigenbetrieblich, 0);
  const antragsjahr =
    application.antragsjahr ?? new Date().getFullYear() - 1;

  const errorMessage = searchParams?.error;

  return (
    <>
      <Stepper current="pruefen" />

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:p-8">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground">
              Rechnungen &amp; Lieferstellen
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Laden Sie Ihre Stromrechnungen hoch oder erfassen Sie Ihre
              Lieferstellen manuell.
            </p>
          </div>

          <div className="mt-6">
            <MassenUpload />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            oder pro Lieferstelle
            <div className="h-px flex-1 bg-border" />
          </div>

          <LieferstellenList initial={initial} />
        </div>

        <div className="mt-6">
          <MindestverbrauchBanner
            summe={summe}
            antragsjahr={antragsjahr}
            anzahlLieferstellen={initial.length}
          />
        </div>

        {errorMessage ? (
          <div className="mt-4 inline-flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {decodeURIComponent(errorMessage)}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <a
            href="/antrag/schritt-1"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Zurück
          </a>
          <form action={weiterZuErklaerungenAction}>
            <Button
              type="submit"
              size="lg"
              className="bg-primary text-white hover:bg-primary/90"
              disabled={summe < MINDEST_KWH_WIRTSCHAFTLICH}
            >
              Weiter zu Erklärungen
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
