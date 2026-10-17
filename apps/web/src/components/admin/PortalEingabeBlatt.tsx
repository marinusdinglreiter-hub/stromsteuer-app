"use client";

import { Badge } from "@stromsteuer/ui/badge";
import { Button } from "@stromsteuer/ui/button";
import { Callout } from "@stromsteuer/ui/callout";
import { Check, Copy, ExternalLink, FileText } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { adminSetPortalFeldAction } from "@/app/admin/actions";

type Feld = {
  key: string;
  abschnitt: string;
  label: string;
  wert: string;
  herkunft: "kunde" | "ocr" | "berechnet" | "kanzlei" | "fest";
  konfidenz: number | null;
  erledigt: boolean;
};

type Beleg = {
  id: string;
  lieferstelleNr: number;
  dateiname: string;
  url: string | null;
  istPdf: boolean;
};

type Props = {
  antragId: string;
  felder: Feld[];
  belege: Beleg[];
  fehlend: string[];
  eingangsnummer: string | null;
};

const HERKUNFT: Record<
  Feld["herkunft"],
  { label: string; variant: "neutral" | "info" | "success" | "warning" }
> = {
  kunde: { label: "Kunde", variant: "neutral" },
  ocr: { label: "Rechnung (OCR)", variant: "info" },
  berechnet: { label: "berechnet", variant: "success" },
  kanzlei: { label: "Kanzlei klärt", variant: "warning" },
  fest: { label: "feste Angabe", variant: "neutral" },
};

/** Ab dieser OCR-Konfidenz gilt ein Wert als unauffaellig. */
const KONFIDENZ_OK = 0.75;

export function PortalEingabeBlatt({ antragId, felder, belege, fehlend, eingangsnummer }: Props) {
  const [erledigt, setErledigt] = useState<Set<string>>(
    () => new Set(felder.filter((f) => f.erledigt).map((f) => f.key)),
  );
  const [kopiert, setKopiert] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [belegId, setBelegId] = useState<string | null>(belege[0]?.id ?? null);
  const [, startTransition] = useTransition();

  const aktuellerBeleg = belege.find((b) => b.id === belegId) ?? null;
  const gruppen = useMemo(() => {
    const out: { abschnitt: string; felder: Feld[] }[] = [];
    for (const f of felder) {
      const last = out[out.length - 1];
      if (last && last.abschnitt === f.abschnitt) last.felder.push(f);
      else out.push({ abschnitt: f.abschnitt, felder: [f] });
    }
    return out;
  }, [felder]);

  const ohneWert = felder.filter((f) => f.wert === "" && f.herkunft !== "kanzlei").length;

  async function kopieren(feld: Feld) {
    try {
      await navigator.clipboard.writeText(feld.wert);
      setKopiert(feld.key);
      setTimeout(() => setKopiert((k) => (k === feld.key ? null : k)), 1500);
    } catch {
      setFehler("Kopieren nicht möglich. Bitte den Wert markieren und von Hand kopieren.");
    }
  }

  function umschalten(feld: Feld) {
    const neu = !erledigt.has(feld.key);
    setFehler(null);
    // sofort anzeigen, bei Fehler zuruecknehmen
    setErledigt((prev) => {
      const next = new Set(prev);
      if (neu) next.add(feld.key);
      else next.delete(feld.key);
      return next;
    });
    startTransition(async () => {
      const res = await adminSetPortalFeldAction(antragId, feld.key, neu);
      if (!res.ok) {
        setFehler(res.error);
        setErledigt((prev) => {
          const next = new Set(prev);
          if (neu) next.delete(feld.key);
          else next.add(feld.key);
          return next;
        });
      }
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={erledigt.size === felder.length ? "success" : "info"}>
            {erledigt.size} von {felder.length} Feldern abgehakt
          </Badge>
          {ohneWert > 0 ? <Badge variant="warning">{ohneWert} ohne Wert</Badge> : null}
          {eingangsnummer ? <Badge variant="success">Eingangsnummer {eingangsnummer}</Badge> : null}
        </div>

        {fehlend.length > 0 ? (
          <Callout variant="warning" className="text-sm" title="Vor dem Einreichen noch offen">
            <ul className="list-disc pl-5">
              {fehlend.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Callout>
        ) : null}

        {fehler ? (
          <Callout variant="danger" className="text-sm">
            {fehler}
          </Callout>
        ) : null}

        {gruppen.map((g) => (
          <section key={g.abschnitt} className="rounded-xl border border-border bg-card">
            <h2 className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Abschnitt {g.abschnitt}
            </h2>
            <ul className="divide-y divide-border">
              {g.felder.map((f) => {
                const fertig = erledigt.has(f.key);
                const leer = f.wert === "";
                const unsicher =
                  f.herkunft === "ocr" && f.konfidenz !== null && f.konfidenz < KONFIDENZ_OK;
                return (
                  <li
                    key={f.key}
                    className={`flex items-start gap-3 px-4 py-3 ${fertig ? "bg-success-soft/40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={fertig}
                      onChange={() => umschalten(f)}
                      aria-label={`${f.label} abgehakt`}
                      className="mt-1 h-4 w-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">{f.label}</div>
                      <div
                        className={`tnum mt-0.5 break-words font-mono text-sm ${
                          leer ? "italic text-warning-foreground" : "text-foreground"
                        }`}
                      >
                        {leer ? "— fehlt —" : f.wert}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant={HERKUNFT[f.herkunft].variant}>
                          {HERKUNFT[f.herkunft].label}
                        </Badge>
                        {f.konfidenz !== null ? (
                          <Badge variant={unsicher ? "warning" : "neutral"}>
                            Erkennung {Math.round(f.konfidenz * 100)} %
                            {unsicher ? " — Beleg prüfen" : ""}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={leer}
                      onClick={() => kopieren(f)}
                      aria-label={`${f.label} kopieren`}
                    >
                      {kopiert === f.key ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {kopiert === f.key ? "Kopiert" : "Kopieren"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Belege</h2>
          {belege.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Keine Rechnungen hochgeladen.</p>
          ) : (
            <>
              <ul className="mt-2 space-y-1">
                {belege.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setBelegId(b.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${
                        b.id === belegId ? "bg-secondary text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">
                        Lieferstelle {b.lieferstelleNr}: {b.dateiname}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {aktuellerBeleg?.url ? (
                <div className="mt-3">
                  {aktuellerBeleg.istPdf ? (
                    <iframe
                      src={aktuellerBeleg.url}
                      title={`Beleg ${aktuellerBeleg.dateiname}`}
                      className="h-[60vh] w-full rounded-md border border-border"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={aktuellerBeleg.url}
                      alt={`Beleg ${aktuellerBeleg.dateiname}`}
                      className="max-h-[60vh] w-full rounded-md border border-border object-contain"
                    />
                  )}
                  <a
                    href={aktuellerBeleg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    In neuem Tab öffnen
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              ) : aktuellerBeleg ? (
                <p className="mt-3 text-xs text-warning-foreground">Beleg-Link nicht verfügbar.</p>
              ) : null}
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
