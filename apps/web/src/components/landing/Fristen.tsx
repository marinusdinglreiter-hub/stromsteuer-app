import { formatDatum, stichtage, tageBis } from "@/config/fristen";

import { Section } from "./Section";

export function Fristen() {
  const s = stichtage();
  const zeilen = [
    {
      datum: s.startOhneZertifikat,
      titel: "Start ohne ELSTER-Zertifikat",
      text: "Das Zertifikat muss erst beantragt werden. Der Aktivierungscode kommt per Post, das dauert ein bis zwei Wochen.",
    },
    {
      datum: s.startMitZertifikat,
      titel: "Start mit ELSTER-Zertifikat",
      text: "Liegt das Zertifikat im Haus oder beim Steuerberater, reicht eine Woche für Registrierung und Vollmacht.",
    },
    {
      datum: s.ausschlussfrist,
      titel: "Ausschlussfrist beim Hauptzollamt",
      text: `Bis dahin muss der Antrag für ${s.verbrauchsjahr} eingegangen sein. Danach verfällt der Anspruch.`,
    },
  ];

  return (
    <Section
      id="fristen"
      muted
      title={`Fristen für das Verbrauchsjahr ${s.verbrauchsjahr}`}
      lead="Die Frist beim Hauptzollamt ist der 31. Dezember. Weil vorher noch Vollmacht, Prüfung und Einreichung passen müssen, liegt der späteste Start deutlich früher."
    >
      <ol className="relative space-y-4 border-l border-border pl-6 sm:max-w-2xl">
        {zeilen.map((z) => {
          const tage = tageBis(z.datum);
          const vorbei = tage < 0;
          return (
            <li key={z.titel} className="relative">
              <span
                aria-hidden
                className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-muted bg-warning"
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="tnum font-semibold text-ink">{formatDatum(z.datum)}</span>
                <span className="font-medium text-ink">{z.titel}</span>
                <span className="tnum text-xs text-warning-foreground">
                  {vorbei ? "vorbei" : tage === 0 ? "heute" : `noch ${tage} Tage`}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{z.text}</p>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        Wer später beginnt, stellt den Antrag für das folgende Verbrauchsjahr.
        Ältere Jahre lassen sich nicht nachholen.
      </p>
    </Section>
  );
}
