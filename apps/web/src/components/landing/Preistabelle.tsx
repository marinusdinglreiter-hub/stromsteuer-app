import { folgejahrPreis, preisTabelle } from "@stromsteuer/api/calc/preise";

import { formatEurRund } from "@/lib/format";

import { Section } from "./Section";

function bandLabel(von: number, bis: number | null): string {
  const f = (n: number) => n.toLocaleString("de-DE");
  return bis === null ? `ab ${f(von)} MWh` : `${f(von)} bis unter ${f(bis)} MWh`;
}

export function Preistabelle() {
  const tabelle = preisTabelle();

  return (
    <Section
      id="preise"
      title="Preise"
      lead="Unser Preis richtet sich nach Ihrem Jahresverbrauch und steht fest, bevor der Antrag eingereicht wird. Er hängt nicht vom Bescheid ab. Die Vorprüfung ist kostenlos: Ergibt sie, dass kein Antrag möglich ist, entsteht keine Rechnung."
    >
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="tnum w-full min-w-[520px] text-sm">
          <caption className="sr-only">
            Preise der Aufbereitung nach Jahresverbrauch, Tabelle {tabelle.version}
          </caption>
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">
                Jahresverbrauch
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Erster Antrag
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Folgejahre
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tabelle.baender.map((b) => (
              <tr key={b.vonMwh}>
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  {bandLabel(b.vonMwh, b.bisMwh)}
                </th>
                <td className="px-5 py-3 text-right font-medium text-ink">
                  {b.preisEur === null ? "individuell" : formatEurRund(b.preisEur)}
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground">
                  {b.preisEur === null
                    ? "individuell"
                    : formatEurRund(folgejahrPreis(b.preisEur, tabelle.folgejahrFaktor))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Alle Preise zzgl. USt. Ab dem zweiten Jahr liegen Stammdaten,
        Lieferstellen und Vollmacht schon vor; neu sind nur Verbrauch und
        Beihilfe-Erklärung. Das Honorar der Kanzlei stellt diese selbst in
        Rechnung.
      </p>
    </Section>
  );
}
