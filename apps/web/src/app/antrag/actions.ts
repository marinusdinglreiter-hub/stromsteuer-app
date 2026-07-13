"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerCaller } from "@/server/trpc";

const updateCalcSchema = z.object({
  antragsjahr: z.coerce.number().int().min(2024).max(2026),
  branche: z.string().min(1).max(100),
  geschaetzteKwh: z.coerce.number().int().min(0).max(50_000_000),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Speichert die Auswahl aus Schritt 1 (Antragsjahr, Branche, kWh-Schaetzung)
 * und revalidiert den Wizard. Aufruf aus Server- oder Client-Components
 * via `<form action={updateCalcAction}>`.
 */
export async function updateCalcAction(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateCalcSchema.safeParse({
    antragsjahr: formData.get("antragsjahr"),
    branche: formData.get("branche"),
    geschaetzteKwh: formData.get("geschaetzteKwh"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Eingaben unvollständig. Bitte Antragsjahr, Branche und Verbrauch ausfüllen.",
    };
  }

  try {
    const caller = await getServerCaller();
    await caller.application.updateCalc(parsed.data);
  } catch (err) {
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unbekannter Fehler beim Speichern." };
  }

  revalidatePath("/antrag/schritt-1");
  return { ok: true };
}

/**
 * Speichert Schritt 1 und navigiert weiter zu Schritt 2 (Lieferstellen).
 *
 * Rueckgabetyp `Promise<void>` weil Next.js Form-Actions keinen Wert zurueckgeben
 * koennen. Validierungsfehler waeren hier ein Bug — auf der Seite sind die
 * Felder hidden und vom Server vorbelegt. Falls doch: Redirect auf Schritt 1
 * mit Error-Query-Param.
 */
export async function weiterZuSchritt2Action(formData: FormData): Promise<void> {
  const result = await updateCalcAction(null, formData);
  if (!result.ok) {
    redirect(`/antrag/schritt-1?error=${encodeURIComponent(result.error)}`);
  }
  redirect("/antrag/schritt-2/lieferstellen");
}
