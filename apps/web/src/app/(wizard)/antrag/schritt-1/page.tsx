import { calculateErstattung } from "@stromsteuer/api";
import { Button } from "@stromsteuer/ui/button";
import { ArrowRight, CheckCircle2, FileText, RefreshCcw } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { weiterZuSchritt2Action } from "@/app/antrag/actions";
import { erklaerungenBestaetigenAction } from "@/app/antrag/schritt-2/triage-actions";
import { AnspruchKarte } from "@/components/wizard/AnspruchKarte";
import { AntragsjahrPicker } from "@/components/wizard/AntragsjahrPicker";
import { AnwaltKarte } from "@/components/wizard/AnwaltKarte";
import { FaqCards } from "@/components/wizard/FaqCards";
import { Stepper } from "@/components/wizard/Stepper";
import { BRANCHEN } from "@/data/branchen";
import { SESSION_COOKIE_NAME } from "@/server/session";
import { getServerCaller } from "@/server/trpc";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { nachTriage?: string };
};

export default async function Schritt1Page({ searchParams }: Props) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    redirect("/antrag/start");
  }

  const caller = await getServerCaller();
  const application = await caller.application.current();

  const branche = application.branche ?? BRANCHEN[0]!.value;
  const antragsjahr = application.antragsjahr ?? new Date().getFullYear() - 1;
  const brancheLabel =
    BRANCHEN.find((b) => b.value === branche)?.label ?? branche;

  const triageDone = application.triageKleinsteRechtsperson !== null;
  const nachTriage = searchParams?.nachTriage === "1";

  // Brutto-kWh: nach Triage = Summe der Lieferstellen; sonst = Schaetzung aus Landing.
  const lieferstellenSumme = application.lieferstellen.reduce(
    (acc, l) => acc + l.jahresKwh,
    0,
  );
  const bruttoKwh =
    triageDone && lieferstellenSumme > 0
      ? lieferstellenSumme
      : (application.geschaetzteKwh ?? 0);

  const result = calculateErstattung({
    bruttoKwh,
    privatnutzungKwh: application.triagePrivatnutzungKwh ?? 0,
    eAutoKwh: application.triageEAutoKwh ?? 0,
  });

  return (
    <>
      <Stepper current="berechnen" />

      <div className="mx-auto max-w-3xl">
        {nachTriage ? (
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Erklärungen gespeichert. Ihr finaler Anspruch steht.
          </div>
        ) : null}

        <div className="mb-4 flex items-center justify-between text-xs">
          <div className="text-muted-foreground">
            Branche: <span className="text-foreground">{brancheLabel}</span>
          </div>
          <AntragsjahrPicker
            current={antragsjahr}
            branche={branche}
            geschaetzteKwh={bruttoKwh}
          />
        </div>

        <AnspruchKarte result={result} bruttoKwh={bruttoKwh} />
        <AnwaltKarte />

        {triageDone ? (
          <form action={erklaerungenBestaetigenAction} className="mt-6">
            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary text-base text-white hover:bg-primary/90"
            >
              Erklärungen bestätigen und weiter
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Nächster Schritt: Firmendaten und Vollmacht. Dauert 2 Minuten.
            </p>
          </form>
        ) : (
          <form action={weiterZuSchritt2Action} className="mt-6">
            <input type="hidden" name="antragsjahr" value={antragsjahr} />
            <input type="hidden" name="branche" value={branche} />
            <input type="hidden" name="geschaetzteKwh" value={bruttoKwh} />
            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary text-base text-white hover:bg-primary/90"
            >
              Online-Antrag starten
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Nächster Schritt: Stromrechnung hochladen. Dauert 2 Minuten.
            </p>
          </form>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:justify-center sm:gap-6">
          <Link
            href="/antrag/schritt-2/lieferstellen?ohne-rechnung=1"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            Ich habe gerade keine Rechnung zur Hand
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Verbrauch ändern und neu berechnen
          </Link>
        </div>

        <FaqCards />
      </div>
    </>
  );
}
