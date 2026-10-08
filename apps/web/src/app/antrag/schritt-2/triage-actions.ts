"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerCaller } from "@/server/trpc";

const triageSchema = z.object({
  kleinsteRechtsperson: z.coerce.boolean(),
  keineFinanzschwierig: z.coerce.boolean(),
  keineEuRueckforderung: z.coerce.boolean(),
  privatnutzung: z.coerce.boolean(),
  privatnutzungKwh: z
    .union([z.coerce.number().int().min(0).max(50_000_000), z.literal("")])
    .optional(),
  eAutoLaden: z.coerce.boolean(),
  eAutoKwh: z
    .union([z.coerce.number().int().min(0).max(50_000_000), z.literal("")])
    .optional(),
  energieAnDritte: z.coerce.boolean(),
  stromAnDritte: z.coerce.boolean(),
  entnahmeDurchDritten: z.coerce.boolean(),
  beihilfeSelbsterklaerung: z.coerce.boolean(),
});

export type TriageResult =
  | { ok: true }
  | { ok: false; error: string };

function readBoolean(value: FormDataEntryValue | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function saveTriageAction(
  _prev: TriageResult | null,
  formData: FormData,
): Promise<TriageResult> {
  // Booleans als "true"/"false" Strings, kWh-Zahlen als String/leer.
  const data = {
    kleinsteRechtsperson: readBoolean(formData.get("kleinsteRechtsperson")),
    keineFinanzschwierig: readBoolean(formData.get("keineFinanzschwierig")),
    keineEuRueckforderung: readBoolean(formData.get("keineEuRueckforderung")),
    privatnutzung: readBoolean(formData.get("privatnutzung")),
    privatnutzungKwh: formData.get("privatnutzungKwh"),
    eAutoLaden: readBoolean(formData.get("eAutoLaden")),
    eAutoKwh: formData.get("eAutoKwh"),
    energieAnDritte: readBoolean(formData.get("energieAnDritte")),
    stromAnDritte: readBoolean(formData.get("stromAnDritte")),
    entnahmeDurchDritten: readBoolean(formData.get("entnahmeDurchDritten")),
    beihilfeSelbsterklaerung: readBoolean(formData.get("beihilfeSelbsterklaerung")),
  };

  // Alle Ja/Nein-Fragen muessen beantwortet sein.
  for (const [key, val] of Object.entries(data)) {
    if (key.includes("Kwh")) continue;
    if (val === undefined) {
      return {
        ok: false,
        error: "Bitte alle Erklärungen mit Ja oder Nein beantworten.",
      };
    }
  }

  const parsed = triageSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, error: first?.message ?? "Eingaben ungueltig." };
  }
  if (!parsed.data.keineEuRueckforderung) {
    return {
      ok: false,
      error:
        "Ohne Bestätigung zur EU-Rückforderung kann der Antrag nicht gestellt werden.",
    };
  }

  const privatKwh =
    typeof parsed.data.privatnutzungKwh === "number"
      ? parsed.data.privatnutzungKwh
      : 0;
  const eAutoKwh =
    typeof parsed.data.eAutoKwh === "number" ? parsed.data.eAutoKwh : 0;

  try {
    const caller = await getServerCaller();
    await caller.application.updateTriage({
      kleinsteRechtsperson: parsed.data.kleinsteRechtsperson,
      keineFinanzschwierig: parsed.data.keineFinanzschwierig,
      keineEuRueckforderung: parsed.data.keineEuRueckforderung,
      privatnutzung: parsed.data.privatnutzung,
      privatnutzungKwh: parsed.data.privatnutzung ? privatKwh : undefined,
      eAutoLaden: parsed.data.eAutoLaden,
      eAutoKwh: parsed.data.eAutoLaden ? eAutoKwh : undefined,
      energieAnDritte: parsed.data.energieAnDritte,
      stromAnDritte: parsed.data.stromAnDritte,
      entnahmeDurchDritten: parsed.data.entnahmeDurchDritten,
      beihilfeSelbsterklaerung: parsed.data.beihilfeSelbsterklaerung,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Speichern fehlgeschlagen.",
    };
  }

  revalidatePath("/antrag/schritt-1");
  revalidatePath("/antrag/schritt-2/erklaerungen");
  return { ok: true };
}

/**
 * Speichert + springt zurueck auf Schritt 1 (Berechnen) mit aktualisierten
 * Werten. Die Schritt-1-Seite erkennt am vorhandenen Triage-Status, dass jetzt
 * die finale Auszahlung angezeigt wird und der CTA „Erklaerungen bestaetigen"
 * heisst.
 */
export async function erstattungBerechnenAction(
  formData: FormData,
): Promise<void> {
  const result = await saveTriageAction(null, formData);
  if (!result.ok) {
    redirect(
      `/antrag/schritt-2/erklaerungen?error=${encodeURIComponent(result.error)}`,
    );
  }
  redirect("/antrag/schritt-1?nachTriage=1");
}

/** Wird vom Schritt-1-Final-CTA aufgerufen — fuehrt zu Schritt 3a. */
export async function erklaerungenBestaetigenAction(): Promise<void> {
  redirect("/antrag/schritt-3/firma");
}
