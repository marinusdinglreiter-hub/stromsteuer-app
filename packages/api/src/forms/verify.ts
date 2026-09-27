import { prisma } from "@stromsteuer/db";

import { sha256Hex } from "../crypto";
import { downloadGenerated } from "../storage/supabase";

export type MandatIntegrity = {
  /** true, wenn der gespeicherte PDF-Hash zum aktuell abgelegten Dokument passt. */
  ok: boolean;
  /** Klartext-Grund, falls die Pruefung nicht erfolgreich war. */
  reason?: string;
  /** Bei der Signatur gespeicherter Soll-Hash (aus der Application). */
  expectedSha256: string | null;
  /** Neu berechneter Ist-Hash der gespeicherten Datei. */
  actualSha256: string | null;
  consentVersion: string | null;
  signedAt: Date | null;
};

/**
 * Prueft die Integritaet einer signierten Mandat-PDF: laedt das gespeicherte
 * Dokument, rechnet den SHA-256 neu und vergleicht ihn mit dem bei der Signatur
 * verankerten Hash. Weicht der Hash ab, wurde die Datei nach der Unterschrift
 * veraendert. Gedacht fuer den Kanzlei-/Admin-Bereich und Beweiszwecke.
 */
export async function verifyMandatIntegrity(
  applicationId: string,
): Promise<MandatIntegrity> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      mandatPdfKey: true,
      mandatPdfSha256: true,
      consentVersion: true,
      mandatSignedAt: true,
    },
  });

  if (!app) {
    return {
      ok: false,
      reason: "Antrag nicht gefunden.",
      expectedSha256: null,
      actualSha256: null,
      consentVersion: null,
      signedAt: null,
    };
  }
  if (!app.mandatPdfKey || !app.mandatPdfSha256) {
    return {
      ok: false,
      reason: "Kein signiertes Mandat vorhanden.",
      expectedSha256: app.mandatPdfSha256 ?? null,
      actualSha256: null,
      consentVersion: app.consentVersion ?? null,
      signedAt: app.mandatSignedAt ?? null,
    };
  }

  const bytes = await downloadGenerated(app.mandatPdfKey);
  const actualSha256 = sha256Hex(bytes);
  const ok = actualSha256 === app.mandatPdfSha256;
  return {
    ok,
    reason: ok
      ? undefined
      : "Integritaets-Hash weicht ab — die gespeicherte PDF wurde veraendert.",
    expectedSha256: app.mandatPdfSha256,
    actualSha256,
    consentVersion: app.consentVersion ?? null,
    signedAt: app.mandatSignedAt ?? null,
  };
}
