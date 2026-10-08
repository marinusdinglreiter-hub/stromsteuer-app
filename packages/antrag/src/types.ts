import type {
  Antrag,
  Lieferstelle,
  Mandant,
  NutzenergieEmpfaenger,
  PortalZugang,
} from "@stromsteuer/db";

/** Ein Antrag mit allen Relationen, die Gate und Datensatz brauchen. */
export type AntragMitRelationen = Antrag & {
  mandant: (Mandant & { portalZugang: PortalZugang | null }) | null;
  lieferstellen: Lieferstelle[];
  nutzenergieEmpfaenger: NutzenergieEmpfaenger[];
};

/** Prisma-Include, das genau diese Form liefert. */
export const ANTRAG_MIT_RELATIONEN_INCLUDE = {
  mandant: { include: { portalZugang: true } },
  lieferstellen: { orderBy: { createdAt: "asc" } },
  nutzenergieEmpfaenger: true,
} as const;
