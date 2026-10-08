# Dokumentation — Leseanleitung

Diese Datei sagt, welches Dokument wann zu lesen ist. Alle Pfade sind relativ
zum Repo-Root.

> Die internen Dokumente `10` bis `70` (Preismodell, Wettbewerb, Vertrieb,
> Architektur-Optionen, Historie) liegen nur lokal und sind nicht Teil des
> öffentlichen Repos. Fachlich nötig sind `formulare/1453-feldspezifikation.md`,
> `20-vollmachts-onboarding.md` und `90-quellen.md`; die sind enthalten.

## Reihenfolge für eine neue Session

1. `../TODO.md` — **die verbindliche Arbeitsliste und Quelle für
   Geschäftsregeln.** Enthält ein Faktenblatt mit allen Zahlen und Quellen,
   Prisma-Blöcke, Code-Gerüste, Akzeptanzkriterien und „Nicht tun"-Hinweise.
   Bei Widerspruch zu irgendeinem anderen Dokument gilt TODO.md.
2. `../CLAUDE.md` — Projektkontext, Konventionen, Repo-Struktur, Dev-Befehle.
3. `10-entscheidung-abrechnungsstruktur.md` — warum es kein Erfolgshonorar mehr
   gibt und wie das Preismodell aussieht. Lesen, bevor an `calc/` gearbeitet
   wird.
4. `formulare/1453-feldspezifikation.md` — die Feldstruktur des Hauptantrags.
   Lesen, bevor am Datenmodell oder am Antragsdatensatz gearbeitet wird.

## Nach Aufgabe

| Aufgabe in TODO.md | zuerst lesen |
|---|---|
| 1.1 Schema | `formulare/1453-feldspezifikation.md` |
| 1.2 Berechnung und Preise | `10-entscheidung-abrechnungsstruktur.md` |
| 1.4 Verträge | `10-entscheidung-abrechnungsstruktur.md` |
| 1.5 / 1.6 Gate und Datensatz | `formulare/1453-feldspezifikation.md` |
| 2.1 Portal-Onboarding | `20-vollmachts-onboarding.md` (enthält alle Textvorlagen) |
| Wettbewerbs- oder Positionierungsfragen | `30-wettbewerb-und-einreichungsmodelle.md` |
| Vertrieb, Provisionen | `40-vertrieb-outsourcing.md` |
| Architektur-Hintergrund | `50-plan-antrags-engine.md` |

## Historie, nicht als Vorgabe lesen

- `60-geschaeftsmodell-historie.md` — Entwicklung des Geschäftsmodells seit der
  ersten Idee. Enthält mehrere überholte Zwischenstände (Self-Submit-SaaS,
  Festpreis-Tiers, Stripe, ELSTER-XML, Energieberater-Provision). Nützlich für
  das Verständnis, **keine Arbeitsanweisung.**
- `70-code-plan-ueberholt.md` — Stand 17.06.2026. Beschreibt das
  Erfolgshonorar-Modell als gebaut. Überholt, aber die Implementierungstabelle
  ist noch brauchbar, um zu sehen, was im Code existiert.

## Externe Quellen

`90-quellen.md` listet die Web-Quellen mit Abrufdatum. Zahlen und Fristen
bitte nur von dort oder aus dem Faktenblatt in `../TODO.md` übernehmen,
niemals aus einem Formular-PDF.
