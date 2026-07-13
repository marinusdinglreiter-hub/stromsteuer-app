"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { uploadAndOcrAction } from "@/app/antrag/schritt-2/actions";
import { FormAlert } from "@/components/ui/FormAlert";

/**
 * Massen-Upload: Akzeptiert mehrere Belege auf einmal, ruft pro Datei
 * `uploadAndOcrAction` ohne lieferstelleId — der Server legt fuer jeden
 * Beleg eine neue Lieferstelle an, vorausgefuellt aus dem OCR-Resultat.
 */
export function MassenUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{
    loading: boolean;
    progress: { done: number; total: number };
    errors: string[];
    info: string | null;
    ocrAvailable: boolean;
  }>({
    loading: false,
    progress: { done: 0, total: 0 },
    errors: [],
    info: null,
    ocrAvailable: true,
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setState({
      loading: true,
      progress: { done: 0, total: list.length },
      errors: [],
      info: null,
      ocrAvailable: true,
    });

    let ocrAvailable = true;
    const fileErrors: string[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i]!;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const result = await uploadAndOcrAction(formData);
        if (!result.ok) {
          fileErrors.push(`${file.name}: ${result.error}`);
        } else if (!result.ocrAvailable) {
          ocrAvailable = false;
        }
      } catch (err) {
        fileErrors.push(
          `${file.name}: ${err instanceof Error ? err.message : "Fehler"}`,
        );
      }
      setState((prev) => ({
        ...prev,
        progress: { done: i + 1, total: list.length },
      }));
    }

    const erfolge = list.length - fileErrors.length;
    setState({
      loading: false,
      progress: { done: list.length, total: list.length },
      errors: fileErrors,
      ocrAvailable,
      info:
        erfolge === 0
          ? null
          : ocrAvailable
            ? `${erfolge} Datei(en) verarbeitet. Lieferstellen werden unten angezeigt.`
            : "Upload erfolgreich. OCR ist nicht konfiguriert — Werte manuell ergänzen.",
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-blue-50/40 p-5">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state.loading}
        className="flex w-full items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm transition hover:bg-blue-50/60 disabled:opacity-60"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-700 text-white">
          {state.loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-900">
            Alle Rechnungen auf einmal hochladen
          </span>
          <span className="block text-xs text-slate-500">
            Lieferstellen werden automatisch erkannt · PDF, JPG, PNG
          </span>
        </span>
      </button>

      {state.loading ? (
        <div className="mt-3 text-xs text-slate-600">
          Verarbeitet {state.progress.done} / {state.progress.total}…
        </div>
      ) : null}
      {state.info ? (
        <FormAlert
          variant={state.ocrAvailable ? "success" : "warning"}
          className="mt-3"
        >
          {state.info}
        </FormAlert>
      ) : null}
      {state.errors.length > 0 ? (
        <FormAlert variant="error" className="mt-3" items={state.errors} />
      ) : null}
    </div>
  );
}
