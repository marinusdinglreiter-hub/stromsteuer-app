/**
 * Portal-Onboarding (TODO 2.1, docs/20-vollmachts-onboarding.md): Zustand,
 * Fortschritt, Erinnerungs-Takt und Stichtagsregel. Rein, ohne IO.
 *
 * Es gibt genau ein verifizierbares Signal: den Zugangscode, der ankommt und
 * sich einloesen laesst. Alles davor ist Selbstauskunft des Kunden.
 */

import type { PortalZugang } from "@stromsteuer/db";

export type OnboardingZugang = Pick<
  PortalZugang,
  | "elsterStatus"
  | "portalKontoStatus"
  | "vollmachtStatus"
  | "schritteErledigt"
  | "eskalationsstufe"
  | "pausiertSeit"
  | "pausierteTage"
>;

export type PortalPhase =
  | "ELSTER_OFFEN"
  | "WARTET_AUF_STB"
  | "WARTET_AUF_POST"
  | "PORTAL_OFFEN"
  | "PORTAL_REGISTRIERT"
  | "VOLLMACHT_ERTEILT"
  | "CODE_EINGELOEST"
  | "AKTIV"
  | "ABGELAUFEN"
  | "SCOPE_FALSCH";

/** Voreinstellung, solange noch kein PortalZugang-Datensatz existiert. */
export const NEUER_ZUGANG: OnboardingZugang = {
  elsterStatus: "UNBEKANNT",
  portalKontoStatus: "OFFEN",
  vollmachtStatus: "OFFEN",
  schritteErledigt: [],
  eskalationsstufe: 0,
  pausiertSeit: null,
  pausierteTage: 0,
};

export function portalPhase(z: OnboardingZugang | null): PortalPhase {
  const zugang = z ?? NEUER_ZUGANG;
  switch (zugang.vollmachtStatus) {
    case "AKTIV":
      return "AKTIV";
    case "CODE_EINGELOEST":
      return "CODE_EINGELOEST";
    case "ABGELAUFEN":
      return "ABGELAUFEN";
    case "SCOPE_FALSCH":
      return "SCOPE_FALSCH";
    case "ERTEILT":
      return "VOLLMACHT_ERTEILT";
    case "OFFEN":
      break;
  }
  switch (zugang.elsterStatus) {
    case "UNBEKANNT":
      return "ELSTER_OFFEN";
    case "BEIM_STB":
      return "WARTET_AUF_STB";
    case "FEHLT":
    case "BEANTRAGT":
      return "WARTET_AUF_POST";
    case "VORHANDEN":
      return zugang.portalKontoStatus === "REGISTRIERT" ? "PORTAL_REGISTRIERT" : "PORTAL_OFFEN";
  }
}

/** Die Anleitung hat fuenf Schritte beim Kunden. */
export const ANZAHL_SCHRITTE = 5;

/** Fortschritt der Spur "Portal-Zugang" in Prozent. */
export function portalFortschritt(z: OnboardingZugang | null): number {
  const phase = portalPhase(z);
  if (phase === "AKTIV") return 100;
  if (phase === "CODE_EINGELOEST") return 90;
  if (phase === "VOLLMACHT_ERTEILT") return 80;
  const erledigt = new Set((z ?? NEUER_ZUGANG).schritteErledigt.filter((s) => s >= 1 && s <= ANZAHL_SCHRITTE));
  return Math.round((erledigt.size / ANZAHL_SCHRITTE) * 80);
}

/** Fortschritt der Spur "Daten": mit unterschriebenen Vertraegen steht sie. */
export function datenFortschritt(beideVertraegeSigniert: boolean): number {
  return beideVertraegeSigniert ? 100 : 60;
}

/** Wartezustaende, in denen die Erinnerungs-Tage nicht zaehlen (Post, ELSTER-Code). */
export function istPausiert(z: Pick<OnboardingZugang, "elsterStatus"> | null): boolean {
  const s = (z ?? NEUER_ZUGANG).elsterStatus;
  return s === "FEHLT" || s === "BEANTRAGT";
}

const TAG_MS = 86_400_000;

/**
 * Pausen-Buchfuehrung bei einem ELSTER-Statuswechsel: beim Eintritt in den
 * Wartezustand merken, beim Verlassen die Dauer aufaddieren.
 */
export function pausenUpdate(
  alt: OnboardingZugang["elsterStatus"],
  neu: OnboardingZugang["elsterStatus"],
  jetzt: Date,
  pausiertSeit: Date | null,
  pausierteTage: number,
): { pausiertSeit: Date | null; pausierteTage: number } {
  const warPausiert = alt === "FEHLT" || alt === "BEANTRAGT";
  const wirdPausiert = neu === "FEHLT" || neu === "BEANTRAGT";
  if (!warPausiert && wirdPausiert) return { pausiertSeit: jetzt, pausierteTage };
  if (warPausiert && !wirdPausiert) {
    const dauer = pausiertSeit ? Math.max(0, Math.floor((jetzt.getTime() - pausiertSeit.getTime()) / TAG_MS)) : 0;
    return { pausiertSeit: null, pausierteTage: pausierteTage + dauer };
  }
  return { pausiertSeit, pausierteTage };
}

/** Tage seit der Vertragsunterschrift ohne Wartezeiten (Post, STB bleibt drin). */
export function wirksameTage(
  signedAt: Date,
  jetzt: Date,
  z: Pick<OnboardingZugang, "pausiertSeit" | "pausierteTage"> | null,
): number {
  const gesamt = Math.floor((jetzt.getTime() - signedAt.getTime()) / TAG_MS);
  const laufendePause = z?.pausiertSeit
    ? Math.max(0, Math.floor((jetzt.getTime() - z.pausiertSeit.getTime()) / TAG_MS))
    : 0;
  return Math.max(0, gesamt - (z?.pausierteTage ?? 0) - laufendePause);
}

/** Tag, ab dem die jeweilige Erinnerungsstufe (1 bis 4) faellig ist. */
export const ERINNERUNG_TAGE = [2, 5, 10, 14] as const;

export type ErinnerungsStufe = 1 | 2 | 3 | 4;

/**
 * Welche Erinnerung ist jetzt faellig? Hoechstens eine, und zwar die
 * hoechste erreichte Stufe, die noch nicht verschickt wurde. Nichts mehr,
 * sobald der Code eingeloest ist (dann ist die Kanzlei am Zug) oder im
 * Wartezustand auf die Post.
 */
export function faelligeErinnerung(
  signedAt: Date,
  jetzt: Date,
  z: OnboardingZugang | null,
): ErinnerungsStufe | null {
  const zugang = z ?? NEUER_ZUGANG;
  if (zugang.vollmachtStatus === "AKTIV" || zugang.vollmachtStatus === "CODE_EINGELOEST") return null;
  if (istPausiert(zugang)) return null;
  const tage = wirksameTage(signedAt, jetzt, zugang);
  let stufe = 0;
  ERINNERUNG_TAGE.forEach((ab, i) => {
    if (tage >= ab) stufe = i + 1;
  });
  return stufe > zugang.eskalationsstufe ? (stufe as ErinnerungsStufe) : null;
}

// --- Stichtagsregel ---------------------------------------------------------

export type StichtagStatus =
  /** Alles im Zeitplan */
  | "ok"
  /** Nach dem 10.11. ohne bestaetigtes Zertifikat wird es eng */
  | "knapp"
  /** Nach dem 24.11.: Einreichung vor Fristende nicht mehr zuverlaessig */
  | "zu-spaet";

export type StichtagErgebnis = {
  status: StichtagStatus;
  /** Ausschlussfrist beim Hauptzollamt (Jahr/Monat/Tag) */
  ausschlussfrist: { jahr: number; monat: number; tag: number };
  startMitZertifikat: { jahr: number; monat: number; tag: number };
  startOhneZertifikat: { jahr: number; monat: number; tag: number };
};

const ymd = (d: { jahr: number; monat: number; tag: number }) => d.jahr * 10_000 + d.monat * 100 + d.tag;

/** Kalendertag in Deutschland (Mitternachts-Grenzfaelle nicht nach UTC kippen). */
export function berlinTag(d: Date): { jahr: number; monat: number; tag: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return { jahr: get("year"), monat: get("month"), tag: get("day") };
}

/**
 * Harte Regel aus docs/20-vollmachts-onboarding.md, rueckwaerts von der
 * Ausschlussfrist (31.12. des Folgejahres) gerechnet: Zertifikat im Haus bis
 * 24.11., sonst bis 10.11. Wer spaeter unterschreibt, schafft die Frist nicht
 * mehr zuverlaessig.
 */
export function stichtagsPruefung(
  verbrauchsjahr: number,
  heute: Date,
  elsterStatus: OnboardingZugang["elsterStatus"] = "UNBEKANNT",
): StichtagErgebnis {
  const fristJahr = verbrauchsjahr + 1;
  const ausschlussfrist = { jahr: fristJahr, monat: 12, tag: 31 };
  const startMitZertifikat = { jahr: fristJahr, monat: 11, tag: 24 };
  const startOhneZertifikat = { jahr: fristJahr, monat: 11, tag: 10 };
  const h = ymd(berlinTag(heute));

  let status: StichtagStatus = "ok";
  if (h > ymd(startMitZertifikat)) status = "zu-spaet";
  else if (h > ymd(startOhneZertifikat) && elsterStatus !== "VORHANDEN") status = "knapp";
  return { status, ausschlussfrist, startMitZertifikat, startOhneZertifikat };
}
