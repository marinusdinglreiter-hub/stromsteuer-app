/**
 * Gemeinsame Bausteine fuer Wizard- und Admin-Router: Antrag mit Relationen
 * laden, Erstattung aus den Lieferstellen rechnen, Datenblatt erzeugen.
 */

import {
  ANTRAG_MIT_RELATIONEN_INCLUDE,
  type AntragMitRelationen,
  type Phase,
} from "@stromsteuer/antrag";
import { prisma } from "@stromsteuer/db";
import { TRPCError } from "@trpc/server";

import { tryLogAudit } from "./audit";
import { calculateErstattung, type CalcResult } from "./calc/stromsteuer";
import { generateDatenblatt, type DatenblattErgebnis } from "./forms/datenblatt";

export async function ladeAntrag(id: string): Promise<AntragMitRelationen> {
  const antrag = await prisma.antrag.findUnique({
    where: { id },
    include: ANTRAG_MIT_RELATIONEN_INCLUDE,
  });
  if (!antrag) throw new TRPCError({ code: "NOT_FOUND" });
  return antrag;
}

/** Summe der drei Mengenspalten aller Lieferstellen. */
export function summeKwh(lieferstellen: AntragMitRelationen["lieferstellen"]): number {
  return lieferstellen.reduce(
    (s, l) => s + l.kwhEigenbetrieblich + l.kwhNutzenergiePG + l.kwhNutzenergieLuF,
    0,
  );
}

/** Erstattung aus Lieferstellen und Triage-Abzuegen. */
export function berechneAntrag(
  antrag: Pick<
    AntragMitRelationen,
    | "antragsjahr"
    | "lieferstellen"
    | "triagePrivatnutzung"
    | "triagePrivatnutzungKwh"
    | "triageEAutoLaden"
    | "triageEAutoKwh"
  >,
): CalcResult {
  return calculateErstattung({
    verbrauchsjahr: antrag.antragsjahr ?? new Date().getFullYear() - 1,
    bruttoKwh: summeKwh(antrag.lieferstellen),
    privatnutzungKwh: antrag.triagePrivatnutzung ? (antrag.triagePrivatnutzungKwh ?? 0) : 0,
    eAutoKwh: antrag.triageEAutoLaden ? (antrag.triageEAutoKwh ?? 0) : 0,
  });
}

/**
 * Erzeugt das Datenblatt aus dem aktuellen Stand und schreibt einen
 * Audit-Eintrag. Immer frisch, damit jede neue Rechnung sofort drin ist.
 */
export async function erzeugeDatenblattFuerAntrag(
  antragId: string,
  opts: { brandName: string; phase?: Phase; actor?: "KANZLEI" | "SYSTEM" | "CUSTOMER" },
): Promise<DatenblattErgebnis> {
  const antrag = await ladeAntrag(antragId);
  const ergebnis = await generateDatenblatt(antrag, {
    brandName: opts.brandName,
    phase: opts.phase,
  });
  await tryLogAudit({
    antragId,
    type: "DATENBLATT_ERZEUGT",
    actor: opts.actor ?? "KANZLEI",
    metadata: {
      lieferstellen: antrag.lieferstellen.length,
      fehlend: ergebnis.fehlend.map((f) => f.feld),
      zuEntlastenEur: ergebnis.datensatz.tabelle.zuEntlastenEur,
    },
  });
  return ergebnis;
}
