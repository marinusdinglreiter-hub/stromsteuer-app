"use client";

import { CLAUSES, renderClause } from "@stromsteuer/api/legal";
import { Button } from "@stromsteuer/ui/button";
import { FileSignature, Scale, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { signVertraegeAction } from "@/app/antrag/schritt-3/actions";
import { FormAlert } from "@/components/ui/FormAlert";
import { BRAND } from "@/config/brand";
import { formatEur, formatEurRund } from "@/lib/format";
import { isValidEmail } from "@/lib/validation";

import { MandatAccordion } from "./MandatAccordion";
import { SignaturCanvas, type SignaturCanvasHandle } from "./SignaturCanvas";
import { TimelineNext } from "./TimelineNext";

type Props = {
  consentVersion: string;
  firmenname: string;
  geschaeftsfuehrer: string;
  antragsjahr: number;
  /** Erstattung nach Selbstbehalt */
  erstattung: number;
  /** Festpreis nach Verbrauchsband; null = individuelles Angebot */
  preisEur: number | null;
};

/**
 * Zwei getrennte Willenserklaerungen (TODO 1.4): Aufbereitungsvertrag mit uns
 * und Mandat/Vollmacht fuer die Kanzlei. Jede mit eigener Zustimmung und
 * eigener Unterschrift — nicht ein Haekchen fuer beides.
 */
export function MandatForm(props: Props) {
  const aufbereitungSig = useSignatur();
  const kanzleiSig = useSignatur();
  const [signerName, setSignerName] = useState("");
  const [email, setEmail] = useState("");
  const [agb, setAgb] = useState(false);
  const [aufbereitung, setAufbereitung] = useState(false);
  const [mandat, setMandat] = useState(false);
  const [vertretung, setVertretung] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const nameValid = signerName.trim().length >= 2;
  const emailValid = isValidEmail(email);
  const canSubmit =
    nameValid &&
    emailValid &&
    agb &&
    vertretung &&
    aufbereitung &&
    mandat &&
    aufbereitungSig.ready &&
    kanzleiSig.ready &&
    !pending;

  const preisText =
    props.preisEur !== null ? `${formatEurRund(props.preisEur)} zzgl. USt.` : "nach individuellem Angebot";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const aufbereitungUrl = aufbereitungSig.dataUrl();
    const kanzleiUrl = kanzleiSig.dataUrl();
    if (!aufbereitungUrl || !kanzleiUrl) {
      setError("Bitte beide Verträge unterschreiben.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("signerName", signerName.trim());
    formData.set("email", email.trim());
    formData.set("agbAccepted", "true");
    formData.set("vertretungsBerechtigt", "true");
    formData.set("aufbereitungAccepted", "true");
    formData.set("aufbereitungSignatur", aufbereitungUrl);
    formData.set("kanzleimandatAccepted", "true");
    formData.set("kanzleimandatSignatur", kanzleiUrl);
    formData.set("consentVersion", props.consentVersion);
    startTransition(async () => {
      try {
        const result = await signVertraegeAction(null, formData);
        if (result && !result.ok) {
          setError(result.error);
        }
        // Bei Erfolg redirected die Action — kein weiterer Handler noetig.
      } catch (err) {
        if (err instanceof Error && !err.message.startsWith("NEXT_REDIRECT")) {
          setError(err.message);
        }
      }
    });
  }

  const jahr = { antragsjahr: props.antragsjahr };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-border bg-muted p-4 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Voraussichtliche Erstattung nach Selbstbehalt
        </div>
        <div className="mt-1 text-3xl font-bold text-foreground">{formatEur(props.erstattung)}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Auszahlung durch das Hauptzollamt direkt an Sie. Unsere Aufbereitung: {preisText}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="h-4 w-4 text-muted-foreground" />
          Unterzeichner
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
            className={INPUT}
          />
          {nameTouched && !nameValid ? (
            <p className="mt-1 text-xs text-destructive">
              Bitte vollständigen Namen angeben (mind. 2 Zeichen).
            </p>
          ) : null}
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-foreground">
            Ihre E-Mail für Bestätigung und Vertrags-PDFs
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="max.mustermann@unternehmen.de"
            aria-invalid={emailTouched && !emailValid}
            className={INPUT}
          />
          {emailTouched && !emailValid ? (
            <p className="mt-1 text-xs text-destructive">Bitte eine gültige E-Mail-Adresse angeben.</p>
          ) : null}
        </label>
        <div className="mt-3 space-y-2.5">
          <Check
            checked={vertretung}
            onChange={setVertretung}
            label="Ich bestätige, dass ich berechtigt bin, im Namen des Unternehmens zu handeln."
          />
          <Check
            checked={agb}
            onChange={setAgb}
            label={
              <>
                Ich akzeptiere die{" "}
                <Link href="/agb" className="text-primary underline-offset-2 hover:underline" target="_blank">
                  AGB
                </Link>{" "}
                der {BRAND.name}.
              </>
            }
          />
        </div>
      </div>

      {/* Vertrag 1 — Aufbereitung (unser Vertrag) */}
      <VertragsBlock
        icon={FileSignature}
        nummer={1}
        titel={`Aufbereitungsvertrag mit ${BRAND.name}`}
        untertitel={`Festpreis: ${preisText}. Fällig unabhängig vom Bescheid.`}
      >
        <MandatAccordion title="Vertragstext lesen">
          <p className="mb-2">
            <strong>Auftraggeber:</strong> {props.firmenname}, vertreten durch {props.geschaeftsfuehrer}.
          </p>
          <p className="mb-2">
            <strong>§ 1 Leistung:</strong> {renderClause(CLAUSES.aufbereitungLeistung, jahr)}
          </p>
          <p className="mb-2">
            <strong>§ 2 Pflichten:</strong> {CLAUSES.pflichtenDesMandanten}
          </p>
          <p>
            <strong>§ 3 Preis:</strong> {CLAUSES.festpreis}
          </p>
        </MandatAccordion>
        <Check
          checked={aufbereitung}
          onChange={setAufbereitung}
          label={`Ich schließe den Aufbereitungsvertrag zum Festpreis (${preisText}) ab.`}
        />
        <SignaturFeld signatur={aufbereitungSig} label="Unterschrift Aufbereitungsvertrag" />
      </VertragsBlock>

      {/* Vertrag 2 — Kanzleimandat */}
      <VertragsBlock
        icon={Scale}
        nummer={2}
        titel={`Mandat und Vollmacht für ${BRAND.kanzlei.name}`}
        untertitel="Die Kanzlei stellt den Antrag im Zoll-Portal und rechnet ihre Vertretung selbst ab."
      >
        <MandatAccordion title="Mandatsvereinbarung lesen">
          <p className="mb-2">
            <strong>Mandatsgegenstand:</strong> {renderClause(CLAUSES.mandatsgegenstand, jahr)}
          </p>
          <p className="mb-2">
            <strong>Verschwiegenheit:</strong> {CLAUSES.verschwiegenheit}
          </p>
          <p>
            <strong>Bescheidzustellung:</strong> {CLAUSES.bescheidzustellung}
          </p>
        </MandatAccordion>
        <MandatAccordion title="Vollmacht lesen">
          <p className="mb-2">
            Hiermit bevollmächtige ich, {props.firmenname}, vertreten durch {props.geschaeftsfuehrer}, die
            Kanzlei {BRAND.kanzlei.name} ({BRAND.kanzlei.anwalt}), mich in folgender Angelegenheit zu
            vertreten:
          </p>
          <p className="mb-2">{renderClause(CLAUSES.vollmachtGegenstand, jahr)}</p>
          <p>{CLAUSES.vollmachtUmfang}</p>
        </MandatAccordion>
        <Check
          checked={mandat}
          onChange={setMandat}
          label="Ich erteile der Kanzlei das Mandat und die Vollmacht wie oben beschrieben."
        />
        <SignaturFeld signatur={kanzleiSig} label="Unterschrift Mandat und Vollmacht" />
      </VertragsBlock>

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
          {pending ? "Wird übermittelt…" : "Beide Verträge unterschreiben"}
        </Button>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Sie erhalten zwei Rechnungen: unsere Aufbereitung und die Vertretung durch die Kanzlei.
      </p>
    </form>
  );
}

const INPUT =
  "block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25";

type SignaturState = ReturnType<typeof useSignatur>;

/** Zustand einer Unterschrift: zeichnen oder tippen (Tastatur-/Screenreader-Fallback). */
function useSignatur() {
  const ref = useRef<SignaturCanvasHandle>(null);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [filled, setFilled] = useState(false);
  const [typed, setTyped] = useState("");
  const typedValid = typed.trim().length >= 2;
  return {
    ref,
    mode,
    setMode,
    filled,
    setFilled,
    typed,
    setTyped,
    typedValid,
    ready: mode === "draw" ? filled : typedValid,
    dataUrl: (): string | null =>
      mode === "draw" ? (ref.current?.getDataUrl() ?? null) : typedSignatureToPng(typed.trim()),
  };
}

function VertragsBlock({
  icon: Icon,
  nummer,
  titel,
  untertitel,
  children,
}: {
  icon: LucideIcon;
  nummer: number;
  titel: string;
  untertitel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs text-muted-foreground">Vertrag {nummer} von 2</div>
          <h2 className="text-sm font-semibold text-foreground">{titel}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{untertitel}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SignaturFeld({ signatur, label }: { signatur: SignaturState; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
          {(["draw", "type"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => signatur.setMode(m)}
              className={
                signatur.mode === m
                  ? "bg-ink px-2.5 py-1 font-medium text-white"
                  : "px-2.5 py-1 text-muted-foreground hover:bg-muted"
              }
            >
              {m === "draw" ? "Zeichnen" : "Tippen"}
            </button>
          ))}
        </div>
      </div>
      {signatur.mode === "draw" ? (
        <>
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={() => {
                signatur.ref.current?.clear();
                signatur.setFilled(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Löschen
            </button>
          </div>
          <SignaturCanvas ref={signatur.ref} height={140} onChange={(f) => signatur.setFilled(f)} />
        </>
      ) : (
        <div>
          <input
            type="text"
            value={signatur.typed}
            onChange={(e) => signatur.setTyped(e.target.value)}
            placeholder="Ihr vollständiger Name als Unterschrift"
            aria-label={`${label} als Text eingeben`}
            className={INPUT}
          />
          {signatur.typedValid ? (
            <div
              className="mt-2 flex h-16 items-center rounded-md border border-border bg-white px-4 text-3xl italic text-foreground"
              style={{ fontFamily: "'Segoe Script','Brush Script MT',cursive" }}
            >
              {signatur.typed.trim()}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Rendert einen getippten Namen als handschrift-aehnliche PNG-Data-URL.
 * Erzeugt dasselbe Format (data:image/png;base64,…) wie der Zeichen-Canvas.
 */
function typedSignatureToPng(name: string): string | null {
  if (typeof document === "undefined" || name.length < 2) return null;
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
