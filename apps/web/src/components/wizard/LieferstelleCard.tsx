"use client";

import { Button } from "@stromsteuer/ui/button";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  MapPin,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useRef, useState, useTransition } from "react";
import type { DragEvent } from "react";

import {
  deleteLieferstelleAction,
  saveLieferstelleAction,
  uploadAndOcrAction,
  type SaveResult,
} from "@/app/antrag/schritt-2/actions";
import { formatKwh } from "@/lib/format";

export type LieferstelleData = {
  id: string;
  firmenname: string;
  adresse: string;
  plz: string | null;
  /** Formular 1453 Spalte 3 — im Wizard als Jahresverbrauch erfasst */
  kwhEigenbetrieblich: number;
  belegFileKeys: string[];
  ocrConfidence: number | null;
};

type Props = {
  index: number;
  lieferstelle: LieferstelleData;
};

export function LieferstelleCard({ index, lieferstelle }: Props) {
  const [open, setOpen] = useState(
    lieferstelle.firmenname === "" || lieferstelle.kwhEigenbetrieblich === 0,
  );
  const [state, formAction] = useFormState<SaveResult | null, FormData>(
    saveLieferstelleAction,
    null,
  );
  const [isDeleting, startDelete] = useTransition();
  const [uploadState, setUploadState] = useState<{
    loading: boolean;
    error: string | null;
    ocrInfo: string | null;
    erkannt: { jahresKwh: number; stromsteuerGezahlt: number | null } | null;
  }>({ loading: false, error: null, ocrInfo: null, erkannt: null });

  const [fields, setFields] = useState({
    firmenname: lieferstelle.firmenname,
    adresse: lieferstelle.adresse,
    plz: lieferstelle.plz ?? "",
    jahresKwh:
      lieferstelle.kwhEigenbetrieblich > 0 ? String(lieferstelle.kwhEigenbetrieblich) : "",
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vollstaendig =
    fields.firmenname.length > 0 &&
    fields.adresse.length > 0 &&
    Number(fields.jahresKwh) > 0;

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  }

  function handleDelete() {
    startDelete(() => {
      void deleteLieferstelleAction(lieferstelle.id);
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    setUploadState({ loading: true, error: null, ocrInfo: null, erkannt: null });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("lieferstelleId", lieferstelle.id);
    try {
      const result = await uploadAndOcrAction(formData);
      if (!result.ok) {
        setUploadState({ loading: false, error: result.error, ocrInfo: null, erkannt: null });
        return;
      }
      const p = result.parsed;
      const confidence = Math.round(p.confidence * 100);
      if (p.confidence > 0) {
        setFields((prev) => ({
          firmenname: p.versorger || prev.firmenname,
          adresse: p.adresse || prev.adresse,
          plz: prev.plz,
          jahresKwh: p.jahresKwh != null ? String(p.jahresKwh) : prev.jahresKwh,
        }));
      }

      // Klare Rueckmeldung statt stillem Leerlauf, je nachdem ob/wie extrahiert
      // wurde (siehe ExtractionStatus in actions.ts).
      const ocrInfo =
        result.extractionStatus === "ok"
          ? `Daten erkannt (${confidence} % Treffsicherheit) — bitte prüfen und speichern.`
          : result.extractionStatus === "unavailable"
            ? "Automatische Erkennung für Bilddateien derzeit nicht verfügbar — bitte Werte manuell eintragen (oder ein PDF hochladen)."
            : "Konnte aus dieser Datei keine Werte lesen (evtl. gescanntes Bild-PDF) — bitte Werte manuell eintragen.";

      const kwh = p.jahresKwh ?? 0;
      const erkannt =
        kwh > 0
          ? { jahresKwh: kwh, stromsteuerGezahlt: p.stromsteuerGezahlt ?? null }
          : null;

      setUploadState({ loading: false, error: null, ocrInfo, erkannt });
    } catch (err) {
      setUploadState({
        loading: false,
        error: err instanceof Error ? err.message : "Upload fehlgeschlagen.",
        ocrInfo: null,
        erkannt: null,
      });
    }
  }

  return (
    <div
      className={
        vollstaendig
          ? "rounded-xl border border-success/30 bg-white shadow-sm"
          : "rounded-xl border border-border bg-white shadow-sm"
      }
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink text-xs font-semibold text-white">
            {index + 1}
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {lieferstelle.firmenname || `Lieferstelle ${index + 1}`}
            </div>
            {vollstaendig ? (
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {lieferstelle.adresse}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {formatKwh(lieferstelle.kwhEigenbetrieblich)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {lieferstelle.belegFileKeys.length === 1
                    ? "1 Rechnung"
                    : `${lieferstelle.belegFileKeys.length} Rechnungen`}
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-xs text-muted-foreground">
                Noch unvollständig
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={
              vollstaendig
                ? "rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"
                : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            }
          >
            {vollstaendig ? "Vollständig" : "Noch unvollständig"}
          </span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open ? (
        <div className="grid gap-6 border-t border-border px-4 py-5 lg:grid-cols-[1fr_280px]">
          <form action={formAction} className="grid gap-3">
            <input type="hidden" name="id" value={lieferstelle.id} />
            <FormField label="Firmenname" required>
              <input
                name="firmenname"
                required
                value={fields.firmenname}
                onChange={(e) => setFields((f) => ({ ...f, firmenname: e.target.value }))}
                placeholder="z. B. Musterfirma GmbH"
                className="block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
              />
            </FormField>
            <FormField label="Adresse der Lieferstelle" required>
              <input
                name="adresse"
                required
                value={fields.adresse}
                onChange={(e) => setFields((f) => ({ ...f, adresse: e.target.value }))}
                placeholder="Straße und Ort"
                className="block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <FormField label="PLZ">
                <input
                  name="plz"
                  value={fields.plz}
                  onChange={(e) => setFields((f) => ({ ...f, plz: e.target.value }))}
                  placeholder="54321"
                  inputMode="numeric"
                  pattern="\d{5}"
                  className="block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
                />
              </FormField>
              <FormField label="Jahresverbrauch (kWh)" required>
                <input
                  name="jahresKwh"
                  type="number"
                  required
                  min={0}
                  step={1}
                  value={fields.jahresKwh}
                  onChange={(e) => setFields((f) => ({ ...f, jahresKwh: e.target.value }))}
                  placeholder="z. B. 80000"
                  className="block w-full rounded-md border border-input bg-white px-3 py-2 text-right text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/25"
                />
              </FormField>
            </div>

            {state && !state.ok ? (
              <div className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-xs text-destructive">
                {state.error}
              </div>
            ) : null}
            {state && state.ok ? (
              <div className="rounded-md border border-success/30 bg-success-soft px-3 py-2 text-xs text-success">
                Gespeichert.
              </div>
            ) : null}

            <div className="mt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Entfernen
              </button>
              <SaveButton />
            </div>
          </form>

          <div
            className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
              isDragging
                ? "border-primary bg-secondary"
                : "border-input bg-muted"
            }`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-xs font-medium text-foreground">
              Rechnung dieser Lieferstelle hochladen
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, JPG, PNG · Drag &amp; Drop oder Datei auswählen
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="sr-only"
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState.loading}
              className={`mt-3 w-full transition-colors ${isDragging ? "border-primary bg-secondary text-primary" : ""}`}
            >
              {uploadState.loading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Verarbeitet…
                </>
              ) : isDragging ? (
                <>
                  <Upload className="mr-1 h-4 w-4" />
                  Hier ablegen
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-4 w-4" />
                  Datei auswählen
                </>
              )}
            </Button>

            {uploadState.error ? (
              <div className="mt-2 inline-flex items-start gap-1 text-xs text-destructive">
                <X className="mt-0.5 h-3 w-3 shrink-0" />
                {uploadState.error}
              </div>
            ) : null}
            {uploadState.ocrInfo ? (
              <div className="mt-2 text-xs italic text-muted-foreground">
                {uploadState.ocrInfo}
              </div>
            ) : null}

            {uploadState.erkannt ? (
              <ErkannteWerteKarte {...uploadState.erkannt} />
            ) : null}

            {lieferstelle.belegFileKeys.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {lieferstelle.belegFileKeys.map((key) => (
                  <li
                    key={key}
                    className="inline-flex w-full items-center gap-1.5 rounded border border-border bg-white px-2 py-1"
                  >
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate">
                      {key.split("/").pop() ?? key}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs italic text-muted-foreground">
                Keine Rechnung? Kein Problem — die manuelle Eingabe links reicht aus.
              </p>
            )}

            {lieferstelle.ocrConfidence !== null &&
            lieferstelle.ocrConfidence < 0.7 ? (
              <div className="mt-3 inline-flex items-center gap-1 rounded border border-warning/30 bg-warning-soft px-2 py-1 text-xs text-warning-foreground">
                <Calendar className="h-3 w-3" />
                OCR-Confidence niedrig — bitte Werte prüfen
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-primary text-white hover:bg-primary/90"
    >
      {pending ? "Speichert…" : "Lieferstelle speichern"}
    </Button>
  );
}

function fmt(eur: number): string {
  return eur.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/**
 * Zeigt nur die aus der Rechnung erkannten Rohwerte (kWh + ggf. Stromsteuer).
 * Bewusst KEIN Euro-Erstattungsbetrag: Der Selbstbehalt (250 €) gilt einmal
 * auf die Summe aller Lieferstellen, nicht pro Lieferstelle. Der
 * korrekte Betrag wird erst in den spaeteren Schritten ueber calculateErstattung
 * berechnet — so sieht der Nutzer nie einen abweichenden Betrag.
 */
function ErkannteWerteKarte({
  jahresKwh,
  stromsteuerGezahlt,
}: {
  jahresKwh: number;
  stromsteuerGezahlt: number | null;
}) {
  return (
    <div className="mt-3 rounded-lg border border-primary/25 bg-secondary p-3 text-xs">
      <div className="mb-2 font-semibold text-ink">
        Aus der Rechnung erkannt
      </div>
      <div className="space-y-1 text-foreground">
        <div className="flex justify-between">
          <span>Jahresverbrauch</span>
          <span className="font-medium tabular-nums">
            {jahresKwh.toLocaleString("de-DE")} kWh
          </span>
        </div>
        {stromsteuerGezahlt !== null ? (
          <div className="flex justify-between">
            <span>Stromsteuer lt. Rechnung</span>
            <span className="font-medium tabular-nums text-muted-foreground">
              {fmt(stromsteuerGezahlt)}
            </span>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-muted-foreground">
        Bitte Werte prüfen und speichern · Ihre Erstattung berechnen wir aus der
        Summe aller Lieferstellen.
      </p>
    </div>
  );
}
