import { Section } from "./Section";

const SCHRITTE = [
  {
    titel: "Vorprüfung",
    text: "Sie geben Branche und Verbrauch an und beantworten die Fragen zu Ihrem Betrieb. Kommt dabei heraus, dass kein Antrag möglich ist, zahlen Sie nichts.",
    dauer: "etwa 10 Minuten",
  },
  {
    titel: "Unterlagen",
    text: "Sie laden die Stromrechnungen des Verbrauchsjahres hoch. Wir lesen die Mengen aus, ordnen sie den Lieferstellen zu und prüfen sie auf Vollständigkeit.",
    dauer: "etwa 15 Minuten",
  },
  {
    titel: "Vollmacht im Zoll-Portal",
    text: "Damit die Kanzlei für Sie einreichen darf, erteilen Sie ihr im Zoll-Portal eine Vollmacht. Wir führen Sie mit einer Anleitung durch und helfen am Telefon, wenn es hakt.",
    dauer: "etwa 20 Minuten",
  },
  {
    titel: "Einreichung",
    text: "Die Kanzlei reicht den Antrag beim Hauptzollamt ein. Den Stand sehen Sie jederzeit auf Ihrer Statusseite.",
    dauer: "Bescheid nach einigen Wochen",
  },
];

export function Ablauf() {
  return (
    <Section
      id="ablauf"
      title="So läuft der Antrag"
      lead="Unterlagen und Portal-Vollmacht laufen parallel. Wer noch auf ein ELSTER-Zertifikat wartet, verliert dadurch keine Zeit bei der Aufbereitung."
    >
      <ol className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {SCHRITTE.map((s, i) => (
          <li key={s.titel} className="flex flex-col bg-card p-6">
            <span className="tnum flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <h3 className="mt-4 text-base font-semibold">{s.titel}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {s.text}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">{s.dauer}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
