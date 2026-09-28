import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { BRAND } from "@/config/brand";

import { Section } from "./Section";

/*
 * Antworten mit rechtlichem Gehalt sind bis zur Pruefung durch einen Anwalt
 * im Quelltext mit [JURISTISCH ZU PRUEFEN] markiert (TODO 5, Anwalt).
 */
const FRAGEN: { frage: string; antwort: ReactNode }[] = [
  {
    frage: "Wer kann die Entlastung beantragen?",
    antwort: (
      <>
        Unternehmen des produzierenden Gewerbes und der Land- und
        Forstwirtschaft im Sinne des § 2 StromStG, deren Entlastung über dem
        Selbstbehalt von 250 € im Jahr liegt. Ob Ihr Betrieb dazugehört,
        beurteilen Sie selbst; wir stellen die Fragen dazu und verweisen auf die
        Angaben des Zolls. Eine steuerliche Einzelfallberatung leisten wir
        nicht.{" "}
        <a
          href="https://www.zoll.de/DE/Fachthemen/Steuern/Verbrauchsteuern/Strom/Steuerbeguenstigung/Steuerentlastungen/Steuerentlastung-nach-Par-9b-StromStG/steuerentlastung-nach-par-9b-stromstg.html"
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Zur Seite des Zolls
        </a>
      </>
    ),
  },
  {
    // [JURISTISCH ZU PRUEFEN]
    frage: "Was kostet es?",
    antwort:
      "Unsere Aufbereitung kostet einen Festpreis, der sich nach Ihrem Jahresverbrauch richtet. Er steht fest, bevor der Antrag eingereicht wird. Die Kanzlei berechnet ihre Vertretung separat. Die Vorprüfung ist kostenlos.",
  },
  {
    frage: "Warum bekomme ich zwei Rechnungen?",
    antwort:
      "Einreichen darf nur eine Kanzlei. Sie schließen deshalb einen Vertrag mit uns für die Aufbereitung und einen direkt mit der Kanzlei für die Vertretung. Jede Seite rechnet ihren Teil selbst ab.",
  },
  {
    // [JURISTISCH ZU PRUEFEN]
    frage: "Was passiert, wenn das Hauptzollamt ablehnt?",
    antwort:
      "Unser Preis bezahlt die Aufbereitung und bleibt auch dann fällig. Die Kanzlei prüft, ob ein Einspruch Aussicht hat. Die eigentliche Unsicherheit liegt vorne, bei der Frage, ob Ihr Betrieb antragsberechtigt ist. Deshalb ist die Vorprüfung kostenlos.",
  },
  {
    frage: "Brauche ich ein ELSTER-Zertifikat?",
    antwort:
      "Ja. Seit 2025 wird der Antrag nur noch im Zoll-Portal gestellt, und die Anmeldung dort setzt ein ELSTER-Organisationszertifikat Ihres Unternehmens voraus. Oft liegt es beim Steuerberater. Dafür haben wir ein Anschreiben, das Sie weiterleiten können. Das Zertifikat schicken Sie bitte niemandem per E-Mail, auch uns nicht.",
  },
  {
    frage: "Wohin geht der Bescheid?",
    antwort:
      "Nach der Vollmacht gehen Bescheide des Hauptzollamts in das Portal-Profil der Kanzlei, nicht mehr in Ihres. Wir leiten sie Ihnen weiter, sobald sie eingehen.",
  },
  {
    frage: "Was passiert mit meinen Daten?",
    antwort:
      "Rechnungen und Angaben liegen auf Servern in der EU und werden nur für den Antrag verwendet. Nicht abgeschlossene Entwürfe löschen wir automatisch. Einzelheiten stehen in der Datenschutzerklärung.",
  },
];

export function Faq() {
  return (
    <Section
      id="faq"
      title="Häufige Fragen"
      lead={
        <>
          Ihre Frage ist nicht dabei? Rufen Sie an unter{" "}
          <a
            href={`tel:${BRAND.phone.replace(/\s/g, "")}`}
            className="tnum text-primary underline-offset-2 hover:underline"
          >
            {BRAND.phone}
          </a>
          .
        </>
      }
    >
      <div className="divide-y divide-border rounded-xl border border-border bg-card sm:max-w-3xl">
        {FRAGEN.map((f) => (
          <details key={f.frage} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium text-ink">
              {f.frage}
              <ChevronDown
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="pb-5 text-sm leading-relaxed text-muted-foreground">
              {f.antwort}
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}
