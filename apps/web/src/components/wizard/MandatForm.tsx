"use client";

import { Button } from "@stromsteuer/ui/button";
import { CheckCircle2, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { signMandatAction } from "@/app/antrag/schritt-3/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { BRAND } from "@/config/brand";
import { formatEur } from "@/lib/format";
import { isValidEmail } from "@/lib/validation";

import { MandatAccordion } from "./MandatAccordion";
import { SignaturCanvas, type SignaturCanvasHandle } from "./SignaturCanvas";
import { TimelineNext } from "./TimelineNext";

type Props = {
  consentVersion: string;
  firmenname: string;
  geschaeftsfuehrer: string;
  antragsjahr: number;
  bruttoErstattung: number;
  honorar: number;
  honorarSatz: number;
  nettoAuszahlung: number;
};

export function MandatForm(props: Props) {
  const sigRef = useRef<SignaturCanvasHandle>(null);
  const [signerName, setSignerName] = useState("");
  const [email, setEmail] = useState("");
  const [signatureFilled, setSignatureFilled] = useState(false);
  const [agb, setAgb] = useState(false);
  const [mandat, setMandat] = useState(false);
  const [vertretung, setVertretung] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Unterschrift wahlweise zeichnen oder tippen (Tastatur-/Screenreader-Fallback).
  const [sigMode, setSigMode] = useState<"draw" | "type">("draw");
  const [typedSig, setTypedSig] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const zustimmungenCount = [agb, mandat, vertretung].filter(Boolean).length;
  const nameValid = signerName.trim().length >= 2;
  const emailValid = isValidEmail(email);
  const typedValid = typedSig.trim().length >= 2;
  const signatureReady = sigMode === "draw" ? signatureFilled : typedValid;
  const canSubmit =
    nameValid &&
    emailValid &&
    signatureReady &&
    agb &&
    mandat &&
    vertretung &&
    !pending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const dataUrl =
      sigMode === "draw"
        ? sigRef.current?.getDataUrl()
        : typedSignatureToPng(typedSig.trim());
    if (!dataUrl) {
      setError(
        sigMode === "draw"
          ? "Bitte unterschreiben Sie im Feld unten."
          : "Bitte geben Sie Ihren Namen als Unterschrift ein.",
      );
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("signerName", signerName.trim());
    formData.set("email", email.trim());
    formData.set("signatureDataUrl", dataUrl);
    formData.set("agbAccepted", "true");
    formData.set("mandatAccepted", "true");
    formData.set("vertretungsBerechtigt", "true");
    formData.set("consentVersion", props.consentVersion);
    startTransition(async () => {
      try {
        const result = await signMandatAction(null, formData);
        if (result && !result.ok) {
          setError(result.error);
        }
        // Bei Erfolg redirected die Action — kein weiterer Handler noetig.
      } catch (err) {
        if (
          err instanceof Error &&
          !err.message.startsWith("NEXT_REDIRECT")
        ) {
          setError(err.message);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Erstattungs-Reminder */}
      <div className="rounded-xl border border-border bg-muted p-4 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Ihre Erstattung nach Abzügen
        </div>
        <div className="mt-1 text-3xl font-bold text-foreground">
          {formatEur(props.nettoAuszahlung)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Sie zahlen 0 € bei Ablehnung.
        </div>
      </div>

      {/* Anwalts-Vertrauenskarte */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-white p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">
            {BRAND.kanzlei.anwalt}
          </div>
          <div className="text-xs text-muted-foreground">
            Steuerberater — {BRAND.kanzlei.name}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Geprüft
        </span>
      </div>

      {/* Mandat + Vollmacht zum Lesen */}
      <MandatAccordion title="Mandatsvereinbarung">
        <p className="mb-2">
          <strong>Mandant:</strong> {props.firmenname}, vertreten durch{" "}
          {props.geschaeftsfuehrer}.
        </p>
        <p className="mb-2">
          <strong>Mandatsgegenstand:</strong> Beantragung der Stromsteuer-Entlastung
          nach § 9b StromStG für das Verbrauchsjahr {props.antragsjahr} beim
          zuständigen Hauptzollamt; Betreuung des Antragsverfahrens bis zur
          Bekanntgabe des Bescheids.
        </p>
        <p className="mb-2">
          <strong>Verschwiegenheit:</strong> {BRAND.kanzlei.name} unterliegt der
          anwaltlichen Schweigepflicht (§ 43a Abs. 2 BRAO). Datenverarbeitung
          DSGVO-konform.
        </p>
        <p>
          Mit Klick auf „Unterschreiben und einreichen" kommt die
          Mandatsvereinbarung verbindlich zustande. Sie erhalten eine
          PDF-Kopie per E-Mail.
        </p>
      </MandatAccordion>

      <MandatAccordion title="Vollmacht">
        <p className="mb-2">
          Hiermit bevollmächtige ich, {props.firmenname}, vertreten durch{" "}
          {props.geschaeftsfuehrer}, die Kanzlei {BRAND.kanzlei.name} (Steuerberater{" "}
          {BRAND.kanzlei.anwalt}), mich in folgender Angelegenheit zu vertreten:
        </p>
        <p className="mb-2">
          Beantragung der Stromsteuer-Entlastung nach § 9b StromStG für das
          Verbrauchsjahr {props.antragsjahr} einschließlich aller damit
          verbundenen Erklärungen (insb. Formular 1139, ggf. Formular 1456)
          gegenüber dem zuständigen Hauptzollamt.
        </p>
        <p>
          Die Vollmacht umfasst Empfangsbevollmächtigung für Bescheide und
          Schriftverkehr. Sie erlischt mit Bekanntgabe des Bescheids bzw.
          Abschluss eines etwaigen Rechtsbehelfsverfahrens.
        </p>
      </MandatAccordion>

      {/* Zustimmungen */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">
            Zustimmungen
          </div>
          <span
            className={
              zustimmungenCount === 3
                ? "rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
                : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            }
          >
            {zustimmungenCount} / 3
          </span>
        </div>
        <div className="space-y-2.5 text-sm text-foreground">
          <Check
            checked={agb}
            onChange={setAgb}
            label={
              <>
                Ich akzeptiere die{" "}
                <Link
                  href="/agb"
                  className="text-primary underline-offset-2 hover:underline"
                  target="_blank"
                >
                  AGB
                </Link>{" "}
                der {BRAND.name}.
              </>
            }
          />
          <Check
            checked={mandat}
            onChange={setMandat}
            label="Ich akzeptiere oben stehende Mandatsvereinbarung und erteile die Vollmacht."
          />
          <Check
            checked={vertretung}
            onChange={setVertretung}
            label="Ich bestätige, dass ich berechtigt bin, im Namen des Unternehmens zu handeln."
          />
        </div>
      </div>

      {/* Digitale Unterschrift */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Digitale Unterschrift
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-foreground">
            Vollständiger Name des Unterzeichners
          </span>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            placeholder="Max Mustermann"
            aria-invalid={nameTouched && !nameValid}
            className="block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
          />
          {nameTouched && !nameValid ? (
            <p className="mt-1 text-xs text-destructive">
              Bitte vollständigen Namen angeben (mind. 2 Zeichen).
            </p>
          ) : null}
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-foreground">
            Ihre E-Mail für Bestätigung und Vollmacht-PDF
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="max.mustermann@unternehmen.de"
            aria-invalid={emailTouched && !emailValid}
            className="block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
          />
          {emailTouched && !emailValid ? (
            <p className="mt-1 text-xs text-destructive">
              Bitte eine gültige E-Mail-Adresse angeben.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Wir senden Bestätigung, unterzeichnete Vollmacht und Status-Updates
              an diese Adresse.
            </p>
          )}
        </label>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Unterschrift
            </span>
            <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
              <button
                type="button"
                onClick={() => setSigMode("draw")}
                className={
                  sigMode === "draw"
                    ? "bg-ink px-2.5 py-1 font-medium text-white"
                    : "px-2.5 py-1 text-muted-foreground hover:bg-muted"
                }
              >
                Zeichnen
              </button>
              <button
                type="button"
                onClick={() => setSigMode("type")}
                className={
                  sigMode === "type"
                    ? "bg-ink px-2.5 py-1 font-medium text-white"
                    : "px-2.5 py-1 text-muted-foreground hover:bg-muted"
                }
              >
                Tippen
              </button>
            </div>
          </div>

          {sigMode === "draw" ? (
            <>
              <div className="mb-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    sigRef.current?.clear();
                    setSignatureFilled(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Löschen
                </button>
              </div>
              <SignaturCanvas
                ref={sigRef}
                height={160}
                onChange={(filled) => setSignatureFilled(filled)}
              />
            </>
          ) : (
            <div>
              <input
                type="text"
                value={typedSig}
                onChange={(e) => setTypedSig(e.target.value)}
                placeholder="Ihr vollständiger Name als Unterschrift"
                aria-label="Unterschrift als Text eingeben"
                className="block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
              />
              {typedValid ? (
                <div
                  className="mt-2 flex h-16 items-center rounded-md border border-border bg-white px-4 text-3xl italic text-foreground"
                  style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}
                >
                  {typedSig.trim()}
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tippen Sie Ihren Namen — er wird als Unterschrift übernommen
                  (barrierefrei, ohne Maus).
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Vergütung: {props.honorarSatz.toString().replace(".", ",")} % der
          Erstattung (basierend auf Ihrem Verbrauch), Mindestbetrag{" "}
          {formatEur(500)}. Gesetzlicher Selbstbehalt: {formatEur(250)}.
          Honorar diesmal:{" "}
          <strong>{formatEur(props.honorar)}</strong>.
        </p>
      </div>

      <TimelineNext />

      {error ? <FormAlert>{error}</FormAlert> : null}

      <div className="flex items-center justify-between">
        <Link
          href="/antrag/schritt-3/firma"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Zurück
        </Link>
        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit}
          className="bg-primary text-white hover:bg-primary/90"
        >
          {pending ? "Wird eingereicht…" : "Unterschreiben und einreichen"}
        </Button>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Sicher, kein Vorab-Kosten. Vergütung nur bei erfolgreicher Erstattung.
      </p>
    </form>
  );
}

/**
 * Rendert einen getippten Namen als handschrift-aehnliche PNG-Data-URL.
 * Fallback fuer Tastatur-/Screenreader-Nutzer, die nicht zeichnen koennen.
 * Erzeugt dasselbe Format (data:image/png;base64,…) wie der Zeichen-Canvas.
 */
function typedSignatureToPng(name: string): string | null {
  if (typeof document === "undefined") return null;
  const width = 600;
  const height = 160;
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#0f172a";
  ctx.font = "italic 44px 'Segoe Script', 'Brush Script MT', cursive";
  ctx.textBaseline = "middle";
  ctx.fillText(name, 24, height / 2);
  return canvas.toDataURL("image/png");
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring/25"
      />
      <span>{label}</span>
    </label>
  );
}
