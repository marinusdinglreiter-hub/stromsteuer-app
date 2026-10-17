"use client";

import { Badge } from "@stromsteuer/ui/badge";
import { Button } from "@stromsteuer/ui/button";
import { Callout } from "@stromsteuer/ui/callout";
import { Input } from "@stromsteuer/ui/input";
import { Progress } from "@stromsteuer/ui/progress";
import { Check, Copy, ExternalLink, Image as ImageIcon, KeyRound, Phone } from "lucide-react";
import { useState, useTransition } from "react";

import {
  codeEinreichenAction,
  rueckrufAction,
  setElsterAction,
  setSchrittAction,
  type PortalActionResult,
} from "@/app/status/[token]/actions";
import { DIENSTLEISTUNG, GESAMT_MINUTEN, PORTAL_SCHRITTE } from "@/config/portal-schritte";

type ElsterStatus = "UNBEKANNT" | "VORHANDEN" | "BEIM_STB" | "FEHLT" | "BEANTRAGT";
type Phase =
  | "ELSTER_OFFEN"
  | "WARTET_AUF_STB"
  | "WARTET_AUF_POST"
  | "PORTAL_OFFEN"
  | "PORTAL_REGISTRIERT"
  | "VOLLMACHT_ERTEILT"
  | "CODE_EINGELOEST"
  | "AKTIV"
  | "ABGELAUFEN"
  | "SCOPE_FALSCH";

export type PortalAnsicht = {
  firmenname: string;
  antragsjahr: number;
  phase: Phase;
  datenProzent: number;
  portalProzent: number;
  elsterStatus: ElsterStatus;
  schritteErledigt: number[];
  codeEingegangen: boolean;
  rueckrufAngefordert: boolean;
  codeFormularVerfuegbar: boolean;
  terminUrl: string | null;
  stichtag: { status: "ok" | "knapp" | "zu-spaet"; startMitZertifikat: { jahr: number; monat: number; tag: number }; startOhneZertifikat: { jahr: number; monat: number; tag: number } };
};

type Props = {
  token: string;
  ansicht: PortalAnsicht;
  kanzleiName: string;
  /** Anschreiben, das der Kunde an den Steuerberater weiterleitet */
  stbAnschreiben: { betreff: string; text: string };
  kontakt: { telefon: string; email: string };
};

function datum(d: { jahr: number; monat: number; tag: number }): string {
  return `${String(d.tag).padStart(2, "0")}.${String(d.monat).padStart(2, "0")}.${d.jahr}`;
}

export function PortalOnboarding({ token, ansicht, kanzleiName, stbAnschreiben, kontakt }: Props) {
  const [pending, startTransition] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [nummer, setNummer] = useState("");
  const [kopiert, setKopiert] = useState(false);
  const [rueckrufInfo, setRueckrufInfo] = useState(ansicht.rueckrufAngefordert);

  const { phase } = ansicht;
  const fertig = phase === "AKTIV";
  const erledigt = new Set(ansicht.schritteErledigt);

  function ausfuehren(aktion: () => Promise<PortalActionResult>, onOk?: () => void) {
    setFehler(null);
    startTransition(async () => {
      const res = await aktion();
      if (!res.ok) setFehler(res.error);
      else onOk?.();
    });
  }

  async function anschreibenKopieren() {
    try {
      await navigator.clipboard.writeText(`${stbAnschreiben.betreff}\n\n${stbAnschreiben.text}`);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      setFehler("Kopieren nicht möglich. Bitte den Text markieren und von Hand kopieren.");
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 lg:p-8" aria-labelledby="portal-titel">
      <h2 id="portal-titel" className="text-lg font-semibold tracking-tight">
        Ihr Zugang zum Zoll-Portal
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ihre Unterlagen sind vollständig. Damit {kanzleiName} den Antrag stellen darf, fehlt nur
        noch die Vollmacht im Zoll-Portal.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium">Ihre Unterlagen</span>
            <span className="text-muted-foreground">{ansicht.datenProzent} %</span>
          </div>
          <Progress value={ansicht.datenProzent} tone="success" label="Fortschritt Unterlagen" />
        </div>
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium">Portal-Zugang</span>
            <span className="text-muted-foreground">{ansicht.portalProzent} %</span>
          </div>
          <Progress
            value={ansicht.portalProzent}
            tone={fertig ? "success" : "primary"}
            label="Fortschritt Portal-Zugang"
          />
        </div>
      </div>

      {fehler ? (
        <Callout variant="danger" className="mt-4 text-sm">
          {fehler}
        </Callout>
      ) : null}

      {fertig ? (
        <Callout variant="success" className="mt-5 text-sm" title="Vollmacht ist aktiv">
          Im Portal müssen Sie nichts weiter tun. Bescheide des Hauptzollamts gehen ab jetzt in das
          Portal-Profil von {kanzleiName}, nicht in Ihres; wir leiten sie Ihnen weiter, sobald sie
          eingehen.
        </Callout>
      ) : (
        <>
          {ansicht.stichtag.status === "zu-spaet" ? (
            <Callout variant="danger" className="mt-5 text-sm" title="Die Frist wird knapp bis unmöglich">
              Für das Verbrauchsjahr {ansicht.antragsjahr} musste der Start bis spätestens{" "}
              {datum(ansicht.stichtag.startMitZertifikat)} erfolgen. Bitte rufen Sie uns an: {kontakt.telefon}.
              Wir prüfen, ob die Einreichung noch gelingt.
            </Callout>
          ) : ansicht.stichtag.status === "knapp" ? (
            <Callout variant="warning" className="mt-5 text-sm" title="Die Zeit wird knapp">
              Ohne vorhandenes ELSTER-Zertifikat musste der Start bis {datum(ansicht.stichtag.startOhneZertifikat)}{" "}
              erfolgen. Mit Zertifikat reicht es bis {datum(ansicht.stichtag.startMitZertifikat)}. Am
              schnellsten geht es mit einem gemeinsamen Termin.
            </Callout>
          ) : null}

          {phase === "SCOPE_FALSCH" ? (
            <Callout variant="danger" className="mt-5 text-sm" title="Falsche Dienstleistung gewählt">
              Die Vollmacht lautet nicht auf „{DIENSTLEISTUNG}“. Bitte Schritt 5 wiederholen, den
              Zugangscode neu erzeugen und unten erneut eintragen.
            </Callout>
          ) : null}
          {phase === "ABGELAUFEN" ? (
            <Callout variant="warning" className="mt-5 text-sm" title="Der Zugangscode ist abgelaufen">
              Bitte im Portal einen neuen Zugangscode erzeugen und unten eintragen.
            </Callout>
          ) : null}

          {/* ELSTER-Zweig */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold">Haben Sie ein ELSTER-Zertifikat?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ohne Zertifikat ist die Anmeldung im Zoll-Portal nicht möglich. Bitte geben Sie
              Zertifikatsdatei und Passwort niemals per E-Mail weiter, auch nicht an uns.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["VORHANDEN", "Ja, im Haus"],
                  ["BEIM_STB", "Liegt beim Steuerberater"],
                  ["FEHLT", "Haben wir nicht"],
                ] as const
              ).map(([status, label]) => {
                const aktiv =
                  ansicht.elsterStatus === status ||
                  (status === "FEHLT" && ansicht.elsterStatus === "BEANTRAGT");
                return (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={aktiv ? "default" : "outline"}
                    disabled={pending}
                    onClick={() => ausfuehren(() => setElsterAction(token, status))}
                    aria-pressed={aktiv}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>

            {ansicht.elsterStatus === "BEIM_STB" ? (
              <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-sm">
                <p className="font-medium">Leiten Sie dieses Anschreiben an Ihren Steuerberater weiter:</p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 font-sans text-xs leading-relaxed">
                  {stbAnschreiben.text}
                </pre>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={anschreibenKopieren}>
                    {kopiert ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                    {kopiert ? "Kopiert" : "Text kopieren"}
                  </Button>
                  <span className="text-xs text-muted-foreground">Betreff: {stbAnschreiben.betreff}</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Führt Ihr Steuerberater die Schritte aus, schickt er Ihnen den Zugangscode und die
                  Beteiligten-Nummer. Dann tragen Sie beides unten ein.
                </p>
              </div>
            ) : null}

            {ansicht.elsterStatus === "FEHLT" || ansicht.elsterStatus === "BEANTRAGT" ? (
              <div className="mt-4 rounded-lg border border-border bg-muted p-4 text-sm">
                <p>
                  Das Zertifikat beantragen Sie bei ELSTER (<span className="font-medium">elster.de</span>,
                  „Registrieren“). Der Aktivierungscode kommt per Post und braucht ein bis zwei Wochen.
                  Solange Sie darauf warten, erinnern wir Sie nicht.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ansicht.elsterStatus === "FEHLT" ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => ausfuehren(() => setElsterAction(token, "BEANTRAGT"))}
                    >
                      Ich habe es beantragt
                    </Button>
                  ) : (
                    <Badge variant="info">Beantragt, wir warten auf die Post</Badge>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => ausfuehren(() => setElsterAction(token, "VORHANDEN"))}
                  >
                    Das Zertifikat ist da
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Anleitung */}
          {ansicht.elsterStatus === "VORHANDEN" || ansicht.elsterStatus === "BEIM_STB" ? (
            <div className="mt-8">
              <h3 className="text-sm font-semibold">
                Die fünf Schritte im Portal <span className="font-normal text-muted-foreground">(zusammen etwa {GESAMT_MINUTEN} Minuten)</span>
              </h3>
              <ol className="mt-3 space-y-3">
                {PORTAL_SCHRITTE.map((s) => {
                  const hak = erledigt.has(s.nr);
                  return (
                    <li
                      key={s.nr}
                      className={`rounded-lg border p-4 ${hak ? "border-success/30 bg-success-soft/40" : "border-border bg-background"}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={hak}
                          disabled={pending}
                          onChange={() => ausfuehren(() => setSchrittAction(token, s.nr, !hak))}
                          aria-label={`Schritt ${s.nr} erledigt`}
                          className="mt-1 h-4 w-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium">
                              {s.nr}. {s.titel}
                            </span>
                            <span className="text-xs text-muted-foreground">ca. {s.minuten} Min.</span>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                          {s.hervorheben ? (
                            <p className="mt-2 rounded-md border-2 border-warning bg-warning-soft px-3 py-2 text-sm font-semibold text-warning-foreground">
                              Dienstleistung genau so wählen: „{s.hervorheben}“
                              <span className="mt-0.5 block text-xs font-normal">
                                Bei einer anderen Auswahl kann {kanzleiName} den Antrag nicht einreichen, und das
                                Portal meldet keinen Fehler.
                              </span>
                            </p>
                          ) : null}
                          {s.link ? (
                            <a
                              href={s.link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              {s.link.label}
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          ) : null}
                          {/* Platzhalter, bis es echte Portal-Screenshots gibt (docs: TODO 2.4) */}
                          {s.screenshot ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.screenshot}
                              alt={`Portal-Bildschirm zu Schritt ${s.nr}`}
                              className="mt-3 w-full rounded-md border border-border"
                            />
                          ) : (
                            <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                              Screenshot des Portal-Bildschirms folgt
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

          {/* Code */}
          {ansicht.elsterStatus === "VORHANDEN" || ansicht.elsterStatus === "BEIM_STB" ? (
            <div className="mt-8">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <KeyRound className="h-4 w-4" aria-hidden />
                Zugangscode und Beteiligten-Nummer
              </h3>
              {ansicht.codeEingegangen ? (
                <Callout variant="info" className="mt-3 text-sm" title="Code ist bei uns eingegangen">
                  {kanzleiName} löst ihn ein und prüft die Vollmacht. Sie müssen nichts weiter tun.
                </Callout>
              ) : ansicht.codeFormularVerfuegbar ? (
                <form
                  className="mt-3 grid gap-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    ausfuehren(() => codeEinreichenAction(token, code, nummer), () => {
                      setCode("");
                      setNummer("");
                    });
                  }}
                >
                  <label className="block text-xs font-medium">
                    Zugangscode
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoComplete="off"
                      className="mt-1"
                      required
                      minLength={4}
                      maxLength={64}
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Beteiligten-Nummer
                    <Input
                      value={nummer}
                      onChange={(e) => setNummer(e.target.value)}
                      autoComplete="off"
                      className="mt-1"
                      required
                      minLength={3}
                      maxLength={40}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={pending}>
                      Zugangscode senden
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Der Code wird verschlüsselt abgelegt und nach dem Einlösen durch {kanzleiName}{" "}
                      gelöscht. Bitte nicht per E-Mail schicken.
                    </p>
                  </div>
                </form>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Bitte schicken Sie Zugangscode und Beteiligten-Nummer an{" "}
                  <a className="text-primary hover:underline" href={`mailto:${kontakt.email}`}>
                    {kontakt.email}
                  </a>{" "}
                  oder rufen Sie uns an.
                </p>
              )}
            </div>
          ) : null}

          {/* Hilfe */}
          <div className="mt-8 rounded-lg border border-border bg-muted p-4 text-sm">
            <p className="font-medium">Sie möchten das nicht allein machen?</p>
            <p className="mt-1 text-muted-foreground">
              15 Minuten Telefon mit Bildschirmfreigabe, danach ist die Vollmacht erteilt.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ansicht.terminUrl ? (
                <Button asChild size="sm">
                  <a href={ansicht.terminUrl} target="_blank" rel="noopener noreferrer">
                    Termin buchen
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || rueckrufInfo}
                onClick={() => ausfuehren(() => rueckrufAction(token), () => setRueckrufInfo(true))}
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {rueckrufInfo ? "Rückruf ist vorgemerkt" : "Rückruf anfordern"}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
