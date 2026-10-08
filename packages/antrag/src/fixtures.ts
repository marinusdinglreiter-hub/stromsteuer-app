/**
 * Test-Fixtures: ein vollstaendiger, einreichbarer Antrag und Varianten davon.
 * Nur fuer Tests, wird nicht exportiert.
 */

import type {
  Lieferstelle,
  Mandant,
  NutzenergieEmpfaenger,
  PortalZugang,
} from "@stromsteuer/db";

import type { AntragMitRelationen } from "./types";

const T0 = new Date("2026-03-01T10:00:00Z");

type Decimalish = AntragMitRelationen["bruttoErstattung"];

export function lieferstelle(over: Partial<Lieferstelle> = {}): Lieferstelle {
  return {
    id: "ls1",
    antragId: "a1",
    firmenname: "Werk Nord",
    adresse: "Industriestr. 1, Regensburg",
    plz: "93055",
    hza: null,
    kwhEigenbetrieblich: 800_000,
    kwhNutzenergiePG: 0,
    kwhNutzenergieLuF: 0,
    versorger: "Stadtwerke",
    zeitraumVon: new Date("2025-01-01T00:00:00Z"),
    zeitraumBis: new Date("2025-12-31T00:00:00Z"),
    stromsteuerGezahltEur: null,
    belegFileKeys: ["a1/rechnung.pdf"],
    ocrConfidence: 0.83,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  };
}

export function empfaenger(over: Partial<NutzenergieEmpfaenger> = {}): NutzenergieEmpfaenger {
  return {
    id: "e1",
    antragId: "a1",
    firmenname: "Nachbar GmbH",
    adresse: "Industriestr. 3, Regensburg",
    kategorie: "PRODUZIERENDES_GEWERBE",
    mengeKwh: 50_000,
    selbsterklaerungVorhanden: true,
    ...over,
  };
}

export function portalZugang(over: Partial<PortalZugang> = {}): PortalZugang {
  return {
    id: "p1",
    mandantId: "m1",
    elsterStatus: "VORHANDEN",
    portalKontoStatus: "REGISTRIERT",
    vollmachtStatus: "AKTIV",
    beteiligtenNummer: "DE123",
    zugangscodeEingeloestAt: T0,
    scopeGeprueftAt: T0,
    scopeGeprueftVon: "Kanzlei",
    bescheidZustellungAktiv: true,
    eskalationsstufe: 0,
    letzteErinnerungAt: null,
    notizen: null,
    ...over,
  };
}

export function mandant(
  over: Partial<Mandant> = {},
  zugang: PortalZugang | null = portalZugang(),
): Mandant & { portalZugang: PortalZugang | null } {
  return {
    id: "m1",
    firmenname: "Muster Metallbau GmbH",
    rechtsform: "GmbH",
    geschaeftsfuehrer: "Erika Muster",
    vorname: "Erika",
    nachname: "Muster",
    email: "info@muster-metallbau.example",
    telefon: null,
    strasse: "Industriestr. 1",
    plz: "93055",
    ort: "Regensburg",
    steuernummer: "244/123/45678",
    ustIdNr: "DE123456789",
    handelsregister: "HRB 12345",
    wzCode: "25.11",
    unternehmensnummer: null,
    hauptzollamt: "Regensburg",
    kontoinhaber: "Muster Metallbau GmbH",
    iban: "DE02120300000000202051",
    bic: "BYLADEM1001",
    unternehmensart: "PRODUZIERENDES_GEWERBE",
    createdAt: T0,
    updatedAt: T0,
    ...over,
    portalZugang: zugang,
  };
}

export function antrag(over: Partial<AntragMitRelationen> = {}): AntragMitRelationen {
  return {
    id: "a1",
    sessionToken: "tok",
    status: "SIGNED",
    mandantId: "m1",
    antragsjahr: 2025,
    branche: "Metallbau",
    geschaetzteKwh: 800_000,
    entlastungsabschnitt: "KALENDERJAHR",
    schaetzungNach17b: null,
    beschreibungTaetigkeitVorgelegt: null,
    stromAnDritteGeleistet: false,
    nutzenergieAnDritteWeitergegeben: false,
    entnahmeDurchDritten: false,
    beihilfeSelbsterklaerungVorhanden: true,
    preisEur: null,
    preisTabelleVersion: "2026-09",
    istFolgejahr: false,
    triageKleinsteRechtsperson: true,
    triageKeineFinanzschwierig: true,
    triageKeineEuRueckforderung: true,
    triagePrivatnutzung: false,
    triagePrivatnutzungKwh: null,
    triageEAutoLaden: false,
    triageEAutoKwh: null,
    triageEnergieAnDritte: false,
    bruttoKwh: 800_000,
    nettoKwh: 800_000,
    bruttoErstattung: null as Decimalish,
    agbAccepted: true,
    vertretungsBerechtigt: true,
    mandatSignerName: "Erika Muster",
    mandatSignerIp: null,
    mandatSignerUserAgent: null,
    consentVersion: "2026-10-08",
    consentTextSha256: null,
    mandatTimestampKey: null,
    aufbereitungAccepted: true,
    aufbereitungSignedAt: T0,
    aufbereitungSignaturePngKey: null,
    aufbereitungPdfKey: null,
    aufbereitungPdfSha256: null,
    kanzleimandatAccepted: true,
    kanzleimandatSignedAt: T0,
    kanzleimandatSignaturePngKey: null,
    kanzleimandatPdfKey: null,
    kanzleimandatPdfSha256: null,
    kanzleiPaketKey: null,
    submittedAt: null,
    hzaDecisionAt: null,
    hzaAmount: null,
    payoutAt: null,
    createdAt: T0,
    updatedAt: T0,
    expiresAt: T0,
    mandant: mandant(),
    lieferstellen: [lieferstelle()],
    nutzenergieEmpfaenger: [],
    ...over,
  };
}
