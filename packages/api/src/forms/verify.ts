import { prisma } from "@stromsteuer/db";

import { sha256Hex } from "../crypto";
import { downloadGenerated } from "../storage/supabase";

export type Vertrag = "aufbereitung" | "kanzleimandat";

export type MandatIntegrity = {
  /** true, wenn der gespeicherte PDF-Hash zum aktuell abgelegten Dokument passt. */
  ok: boolean;
  /** Klartext-Grund, falls die Pruefung nicht erfolgreich war. */
  reason?: string;
  /** Bei der Signatur gespeicherter Soll-Hash. */
  expectedSha256: string | null;
  /** Neu berechneter Ist-Hash der gespeicherten Datei. */
  actualSha256: string | null;
  consentVersion: string | null;
  signedAt: Date | null;
};

/**
 * Prueft die Integritaet eines signierten Vertrags-PDFs: laedt das gespeicherte
 * Dokument, rechnet den SHA-256 neu und vergleicht ihn mit dem bei der Signatur
 * verankerten Hash. Weicht der Hash ab, wurde die Datei nach der Unterschrift
 * veraendert. Gedacht fuer den Kanzlei-/Admin-Bereich und Beweiszwecke.
 */
export async function verifyMandatIntegrity(
  antragId: string,
  vertrag: Vertrag = "kanzleimandat",
): Promise<MandatIntegrity> {
  const antrag = await prisma.antrag.findUnique({
    where: { id: antragId },
    select: {
      aufbereitungPdfKey: true,
      aufbereitungPdfSha256: true,
      aufbereitungSignedAt: true,
      kanzleimandatPdfKey: true,
      kanzleimandatPdfSha256: true,
      kanzleimandatSignedAt: true,
      consentVersion: true,
    },
  });

  if (!antrag) {
    return {
      ok: false,
      reason: "Antrag nicht gefunden.",
      expectedSha256: null,
      actualSha256: null,
      consentVersion: null,
      signedAt: null,
    };
  }

  const key = vertrag === "aufbereitung" ? antrag.aufbereitungPdfKey : antrag.kanzleimandatPdfKey;
  const expected =
    vertrag === "aufbereitung" ? antrag.aufbereitungPdfSha256 : antrag.kanzleimandatPdfSha256;
  const signedAt =
    vertrag === "aufbereitung" ? antrag.aufbereitungSignedAt : antrag.kanzleimandatSignedAt;

  if (!key || !expected) {
    return {
      ok: false,
      reason: "Kein signierter Vertrag vorhanden.",
      expectedSha256: expected ?? null,
      actualSha256: null,
      consentVersion: antrag.consentVersion ?? null,
      signedAt: signedAt ?? null,
    };
  }

  const bytes = await downloadGenerated(key);
  const actualSha256 = sha256Hex(bytes);
  const ok = actualSha256 === expected;
  return {
    ok,
    reason: ok
      ? undefined
      : "Integritaets-Hash weicht ab — die gespeicherte PDF wurde veraendert.",
    expectedSha256: expected,
    actualSha256,
    consentVersion: antrag.consentVersion ?? null,
    signedAt: signedAt ?? null,
  };
}
