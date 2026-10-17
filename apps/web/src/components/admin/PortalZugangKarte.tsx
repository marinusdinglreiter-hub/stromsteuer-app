"use client";

import { Badge } from "@stromsteuer/ui/badge";
import { Button } from "@stromsteuer/ui/button";
import { Callout } from "@stromsteuer/ui/callout";
import { Check, Copy, Eye, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";

import {
  adminSetPortalVollmachtAction,
  adminZugangscodeAnzeigenAction,
  adminZugangscodeEingeloestAction,
  type VollmachtEingabe,
} from "@/app/admin/actions";
import { DIENSTLEISTUNG } from "@/config/portal-schritte";

type Props = {
  antragId: string;
  /** Ohne Mandant (Firmendaten fehlen) kann nichts gespeichert werden */
  mandantVorhanden: boolean;
  vollmachtStatus: VollmachtEingabe["vollmachtStatus"];
  elsterStatus: NonNullable<VollmachtEingabe["elsterStatus"]>;
  beteiligtenNummer: string | null;
  /** Ein verschluesselter Code liegt vor, ist aber noch nicht eingeloest */
  codeVorhanden: boolean;
  codeEingegangenAt: string | null;
  eskalationsstufe: number;
  rueckrufAngefordertAt: string | null;
  schritteErledigt: number[];
};

const STATUS_OPTIONEN: [VollmachtEingabe["vollmachtStatus"], string][] = [
  ["OFFEN", "offen"],
  ["ERTEILT", "erteilt (Code vom Kunden)"],
  ["CODE_EINGELOEST", "Zugangscode eingelöst"],
  ["AKTIV", "aktiv, Umfang geprüft"],
  ["SCOPE_FALSCH", "falsche Dienstleistung gewählt"],
  ["ABGELAUFEN", "Code abgelaufen"],
];

const ELSTER_OPTIONEN: [NonNullable<VollmachtEingabe["elsterStatus"]>, string][] = [
  ["UNBEKANNT", "unbekannt"],
  ["VORHANDEN", "Zertifikat im Haus"],
  ["BEIM_STB", "liegt beim Steuerberater"],
  ["FEHLT", "fehlt"],
  ["BEANTRAGT", "beantragt (Post)"],
];

const STUFEN_HINWEIS: Record<number, string> = {
  1: "Erinnerung 1 gesendet (Tag 2)",
  2: "Erinnerung 2 gesendet (Tag 5, Termin angeboten)",
  3: "Erinnerung 3 gesendet (Tag 10): Anruf beim Kunden fällig",
  4: "Erinnerung 4 gesendet (Tag 14)",
};

function datumZeit(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PortalZugangKarte(props: Props) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(props.vollmachtStatus);
  const [elster, setElster] = useState(props.elsterStatus);
  const [nummer, setNummer] = useState(props.beteiligtenNummer ?? "");
  const [scope, setScope] = useState(false);
  const [bescheid, setBescheid] = useState(false);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [code, setCode] = useState<{ code: string; nummer: string | null } | null>(null);
  const [kopiert, setKopiert] = useState<string | null>(null);

  // Die Pruefung verlangt nur der Wechsel auf "aktiv"; spaetere Korrekturen nicht.
  const pruefungNoetig = status === "AKTIV" && props.vollmachtStatus !== "AKTIV";
  const speichernGesperrt = !props.mandantVorhanden || (pruefungNoetig && !(scope && bescheid));

  function speichern() {
    setMeldung(null);
    startTransition(async () => {
      const res = await adminSetPortalVollmachtAction({
        id: props.antragId,
        vollmachtStatus: status,
        elsterStatus: elster,
        beteiligtenNummer: nummer,
        scopeGeprueft: scope,
        bescheidZustellungAktiv: bescheid,
      });
      setMeldung(res.ok ? { ok: true, text: "Gespeichert." } : { ok: false, text: res.error });
      if (res.ok && status !== "ERTEILT") setCode(null);
    });
  }

  function codeAnzeigen() {
    setMeldung(null);
    startTransition(async () => {
      const res = await adminZugangscodeAnzeigenAction(props.antragId);
      if (res.ok) setCode({ code: res.code, nummer: res.beteiligtenNummer });
      else setMeldung({ ok: false, text: res.error });
    });
  }

  function codeEingeloest() {
    setMeldung(null);
    startTransition(async () => {
      const res = await adminZugangscodeEingeloestAction(props.antragId);
      if (res.ok) {
        setCode(null);
        setStatus("CODE_EINGELOEST");
        setMeldung({ ok: true, text: "Code gelöscht, Status auf „eingelöst“ gesetzt. Jetzt Umfang prüfen." });
      } else {
        setMeldung({ ok: false, text: res.error });
      }
    });
  }

  async function kopieren(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(key);
      setTimeout(() => setKopiert((k) => (k === key ? null : k)), 1500);
    } catch {
      setMeldung({ ok: false, text: "Kopieren nicht möglich." });
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {props.schritteErledigt.length > 0 ? (
          <Badge variant="neutral">Kunde: {props.schritteErledigt.length} von 5 Schritten abgehakt</Badge>
        ) : null}
        {props.eskalationsstufe > 0 ? (
          <Badge variant={props.eskalationsstufe >= 3 ? "warning" : "neutral"}>
            {STUFEN_HINWEIS[props.eskalationsstufe]}
          </Badge>
        ) : null}
        {props.rueckrufAngefordertAt ? (
          <Badge variant="warning">Rückruf gewünscht seit {datumZeit(props.rueckrufAngefordertAt)}</Badge>
        ) : null}
      </div>

      {props.codeVorhanden ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 font-medium">
            <KeyRound className="h-4 w-4 text-primary" aria-hidden />
            Zugangscode vom Kunden eingegangen
          </div>
          {props.codeEingegangenAt ? (
            <p className="mt-0.5 text-xs text-muted-foreground">am {datumZeit(props.codeEingegangenAt)}</p>
          ) : null}
          {code ? (
            <dl className="mt-2 space-y-1.5 text-sm">
              {[
                ["Zugangscode", code.code, "code"],
                ["Beteiligten-Nummer", code.nummer ?? "", "nummer"],
              ].map(([label, wert, key]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-all font-mono">{wert || "—"}</dd>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!wert}
                    onClick={() => kopieren(wert!, key!)}
                    aria-label={`${label} kopieren`}
                  >
                    {kopiert === key ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  </Button>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {!code ? (
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={codeAnzeigen}>
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Code anzeigen
              </Button>
            ) : null}
            <Button type="button" size="sm" disabled={pending} onClick={codeEingeloest}>
              Code ist im Portal eingelöst
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Jeder Abruf steht im Audit-Log. Nach „eingelöst“ wird der Code gelöscht.
          </p>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">ELSTER-Zertifikat</span>
        <select
          value={elster}
          onChange={(e) => setElster(e.target.value as typeof elster)}
          className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {ELSTER_OPTIONEN.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">Status der Vollmacht</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {STATUS_OPTIONEN.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">Beteiligten-Nummer</span>
        <input
          value={nummer}
          onChange={(e) => setNummer(e.target.value)}
          className="block h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>

      {pruefungNoetig ? (
        <fieldset className="space-y-1.5 rounded-md border border-warning/40 bg-warning-soft/50 p-3">
          <legend className="px-1 text-xs font-medium">Vor „aktiv“ bitte im Portal prüfen</legend>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={scope} onChange={(e) => setScope(e.target.checked)} className="mt-0.5" />
            <span>Die Vollmacht lautet auf „{DIENSTLEISTUNG}“.</span>
          </label>
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={bescheid} onChange={(e) => setBescheid(e.target.checked)} className="mt-0.5" />
            <span>Die digitale Bescheidbereitstellung ist aktiv.</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Erst danach schaltet die Kundenseite auf „fertig“ und die Bestätigungsmail geht raus.
          </p>
        </fieldset>
      ) : null}

      <Button type="button" className="w-full" variant="outline" disabled={pending || speichernGesperrt} onClick={speichern}>
        Speichern
      </Button>

      {meldung ? (
        <Callout variant={meldung.ok ? "success" : "danger"} className="text-xs">
          {meldung.text}
        </Callout>
      ) : null}
      <p className="text-xs text-muted-foreground">Dienstleistung muss „{DIENSTLEISTUNG}“ sein.</p>
    </div>
  );
}
