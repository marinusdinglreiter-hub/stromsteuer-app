import { Check, FileSpreadsheet, Landmark } from "lucide-react";

import { BRAND } from "@/config/brand";

import { Section } from "./Section";

const SPALTEN = [
  {
    icon: FileSpreadsheet,
    wer: "Wir",
    rolle: "Aufbereitung",
    punkte: [
      "Verbräuche aus den Stromrechnungen erheben",
      "Angaben auf Vollständigkeit prüfen",
      "Antrag und Anlagen aufbauen",
      "Portal-Vollmacht mit Ihnen einrichten",
    ],
    preis: "Festpreis nach Verbrauchsband",
  },
  {
    icon: Landmark,
    wer: BRAND.kanzlei.name,
    rolle: "Vertretung und Einreichung",
    punkte: [
      "Mandat und Vollmacht im Zoll-Portal",
      "Einreichung beim Hauptzollamt",
      "Empfang des Bescheids",
      "Rückfragen des Hauptzollamts",
    ],
    preis: "Pauschale der Kanzlei, separat",
  },
];

export function ZweiRechnungen() {
  return (
    <Section
      id="rechnungen"
      muted
      title="Wer was macht, und warum Sie zwei Rechnungen bekommen"
      lead="Den rechtlichen Schritt darf nur eine Kanzlei gehen. Deshalb schließen Sie zwei Verträge: einen mit uns für die Aufbereitung, einen direkt mit der Kanzlei für die Einreichung. Wir empfehlen die Kanzlei, vermitteln aber nicht in Ihrem Namen, und für die Empfehlung fließt zwischen uns und der Kanzlei kein Geld."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {SPALTEN.map((s) => (
          <div key={s.rolle} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <div className="text-sm text-muted-foreground">{s.rolle}</div>
                <h3 className="text-base font-semibold">{s.wer}</h3>
              </div>
            </div>
            <ul className="mt-5 space-y-2.5 text-sm">
              {s.punkte.map((p) => (
                <li key={p} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-border pt-4 text-sm font-medium text-ink">
              {s.preis}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Unsere Rechnung ist meist die größere, obwohl die Kanzlei einreicht. Der
        Aufwand steckt in der Datenarbeit: Verbräuche erheben, Voraussetzungen
        prüfen, Antrag und Anlagen erstellen.
      </p>
    </Section>
  );
}
