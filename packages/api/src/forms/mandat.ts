/**
 * Mandat-PDF-Generator (MVP).
 *
 * Erzeugt ein 3-seitiges PDF mit:
 *   1) Mandatsvereinbarung
 *   2) Vollmacht zur Antragstellung beim Hauptzollamt
 *   3) Erfolgshonorar-Vereinbarung + Signatur-Block
 *
 * !! Die juristischen Texte sind Platzhalter. Vor Live-Schaltung muessen sie
 * !! durch finale Templates der Partnerkanzlei ersetzt werden. Stellen, die
 * !! die Kanzlei pruefen muss, sind mit [...] markiert.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { CLAUSES, CONSENT_VERSION, renderClause } from "./legalTexts";

export type MandatInput = {
  applicationId: string;
  signedAt: Date;
  // Mandant (Firma)
  firmenname: string;
  rechtsform: string;
  geschaeftsfuehrer: string;
  strasse: string;
  plz: string;
  ort: string;
  email: string;
  // Anspruch
  bruttoErstattung: number;
  honorar: number;
  nettoAuszahlung: number;
  antragsjahr: number;
  // Kanzlei (aus Brand-Config)
  kanzleiName: string;
  kanzleiAnwalt: string;
  // Signatur
  signerName: string;
  signerIp: string | null;
  /** "data:image/png;base64,..." aus dem Canvas. Optional — Signaturblock wird sonst leer angezeigt. */
  signatureDataUrl: string | null;
  /**
   * Version des zustimmungspflichtigen Wortlauts (aus `legalTexts`). Optional —
   * faellt auf die aktuell im Code gebundene `CONSENT_VERSION` zurueck.
   */
  consentVersion?: string;
};

const A4 = { width: 595.28, height: 841.89 };
const MARGIN_X = 56;
const MARGIN_TOP = 80;
const MARGIN_BOTTOM = 60;
const BODY_FONT_SIZE = 10.5;
const HEADING_FONT_SIZE = 16;
const SUBHEADING_FONT_SIZE = 12;
const LINE_HEIGHT = 14;

function eur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

function dateTime(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function wrap(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine === "") {
      lines.push("");
      continue;
    }
    const words = rawLine.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);
      if (width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

type DrawState = {
  page: PDFPage;
  y: number;
  pdfDoc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  pageIndex: number;
  totalPages: number;
};

function newPage(state: DrawState, header: string): DrawState {
  const page = state.pdfDoc.addPage([A4.width, A4.height]);
  drawHeader(page, state.fontBold, state.font, header, state.pageIndex + 1);
  return {
    ...state,
    page,
    y: A4.height - MARGIN_TOP,
    pageIndex: state.pageIndex + 1,
  };
}

function drawHeader(
  page: PDFPage,
  fontBold: PDFFont,
  font: PDFFont,
  title: string,
  pageNumber: number,
) {
  page.drawText(title, {
    x: MARGIN_X,
    y: A4.height - 40,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.25),
  });
  page.drawText(`Seite ${pageNumber}`, {
    x: A4.width - MARGIN_X - 50,
    y: A4.height - 40,
    size: 9,
    font,
    color: rgb(0.45, 0.45, 0.55),
  });
  page.drawLine({
    start: { x: MARGIN_X, y: A4.height - 50 },
    end: { x: A4.width - MARGIN_X, y: A4.height - 50 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.9),
  });
}

function drawHeading(state: DrawState, text: string): DrawState {
  if (state.y < MARGIN_BOTTOM + 40) {
    state = newPage(state, text);
  }
  state.page.drawText(text, {
    x: MARGIN_X,
    y: state.y,
    size: HEADING_FONT_SIZE,
    font: state.fontBold,
    color: rgb(0.08, 0.1, 0.18),
  });
  return { ...state, y: state.y - HEADING_FONT_SIZE - 8 };
}

function drawSubheading(state: DrawState, text: string): DrawState {
  if (state.y < MARGIN_BOTTOM + 40) {
    state = newPage(state, "Mandat-Anlage");
  }
  state.page.drawText(text, {
    x: MARGIN_X,
    y: state.y,
    size: SUBHEADING_FONT_SIZE,
    font: state.fontBold,
    color: rgb(0.15, 0.18, 0.3),
  });
  return { ...state, y: state.y - SUBHEADING_FONT_SIZE - 4 };
}

function drawBody(state: DrawState, text: string): DrawState {
  const maxWidth = A4.width - 2 * MARGIN_X;
  const lines = wrap(text, state.font, BODY_FONT_SIZE, maxWidth);
  let y = state.y;
  let { page } = state;
  let { pageIndex } = state;
  for (const line of lines) {
    if (y < MARGIN_BOTTOM) {
      const next = newPage({ ...state, y, page, pageIndex }, "Mandat-Anlage");
      page = next.page;
      pageIndex = next.pageIndex;
      y = next.y;
    }
    page.drawText(line, {
      x: MARGIN_X,
      y,
      size: BODY_FONT_SIZE,
      font: state.font,
      color: rgb(0.1, 0.12, 0.2),
    });
    y -= LINE_HEIGHT;
  }
  return { ...state, y: y - 4, page, pageIndex };
}

function drawSpacer(state: DrawState, height: number): DrawState {
  return { ...state, y: state.y - height };
}

export async function generateMandatPdf(
  input: MandatInput,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  pdfDoc.setTitle(`Mandat ${input.firmenname} — § 9b StromStG`);
  pdfDoc.setAuthor(input.kanzleiName);
  pdfDoc.setCreator("Stromsteuer-Erstattung MVP");
  pdfDoc.setCreationDate(input.signedAt);

  const firstPage = pdfDoc.addPage([A4.width, A4.height]);
  drawHeader(
    firstPage,
    fontBold,
    font,
    `Mandatsvereinbarung — ${input.firmenname}`,
    1,
  );

  let state: DrawState = {
    page: firstPage,
    y: A4.height - MARGIN_TOP,
    pdfDoc,
    font,
    fontBold,
    pageIndex: 0,
    totalPages: 0,
  };

  // ---- Mandanten- + Kanzlei-Box ----
  state = drawHeading(state, "Mandatsvereinbarung");
  state = drawBody(
    state,
    [
      `Datum: ${dateTime(input.signedAt)}`,
      `Vorgang: ${input.applicationId}`,
      "",
      "Mandant:",
      `${input.firmenname} (${input.rechtsform})`,
      `Vertreten durch: ${input.geschaeftsfuehrer}`,
      `${input.strasse}, ${input.plz} ${input.ort}`,
      `E-Mail: ${input.email}`,
      "",
      "Mandatsnehmer:",
      input.kanzleiName,
      `Rechtsanwalt: ${input.kanzleiAnwalt}`,
    ].join("\n"),
  );
  state = drawSpacer(state, 8);

  // ---- § 1 Mandatsgegenstand ----
  state = drawSubheading(state, "§ 1 Mandatsgegenstand");
  state = drawBody(
    state,
    renderClause(CLAUSES.mandatsgegenstand, { antragsjahr: input.antragsjahr }),
  );
  state = drawSpacer(state, 6);

  // ---- § 2 Pflichten des Mandanten ----
  state = drawSubheading(state, "§ 2 Pflichten des Mandanten");
  state = drawBody(state, CLAUSES.pflichtenDesMandanten);
  state = drawSpacer(state, 6);

  // ---- § 3 Verschwiegenheit ----
  state = drawSubheading(state, "§ 3 Verschwiegenheit und Datenschutz");
  state = drawBody(state, CLAUSES.verschwiegenheit);

  // ===== Seite 2 — Vollmacht =====
  state = newPage(state, "Vollmacht");
  state = drawHeading(state, "Vollmacht");
  state = drawBody(
    state,
    [
      `Hiermit bevollmaechtige ich, ${input.firmenname} (${input.rechtsform}),`,
      `vertreten durch ${input.geschaeftsfuehrer},`,
      "",
      input.kanzleiName,
      `Rechtsanwalt ${input.kanzleiAnwalt},`,
      "",
      "mich in nachstehender Angelegenheit umfassend zu vertreten:",
    ].join("\n"),
  );
  state = drawSpacer(state, 4);
  state = drawBody(
    state,
    renderClause(CLAUSES.vollmachtGegenstand, { antragsjahr: input.antragsjahr }),
  );
  state = drawSpacer(state, 4);
  state = drawBody(state, CLAUSES.vollmachtUmfang);

  // ===== Seite 3 — Erfolgshonorar + Signatur =====
  state = newPage(state, "Erfolgshonorar & Signatur");
  state = drawHeading(state, "Erfolgshonorar-Vereinbarung");
  state = drawBody(state, CLAUSES.erfolgshonorar);
  state = drawSpacer(state, 6);
  state = drawSubheading(state, "Vergutungs-Eckdaten");
  state = drawBody(
    state,
    [
      `Brutto-Erstattungsanspruch:    ${eur(input.bruttoErstattung)}`,
      `Erfolgshonorar (inkl. Floor):  ${eur(input.honorar)}`,
      `Voraussichtliche Auszahlung an Mandant: ${eur(input.nettoAuszahlung)}`,
      "",
      "Mindesthonorar: 500,00 EUR im Erfolgsfall.",
      "Bei Ablehnung des Antrags faellt kein Honorar an (0,00 EUR).",
    ].join("\n"),
  );

  // ---- Signaturblock ----
  state = drawSpacer(state, 16);
  state = drawSubheading(state, "Digitale Signatur");
  state = drawBody(
    state,
    [
      `Vollstaendiger Name: ${input.signerName}`,
      `Unterschrieben am: ${dateTime(input.signedAt)}`,
      `IP-Adresse: ${input.signerIp ?? "—"}`,
      `Einwilligungs-Version: ${input.consentVersion ?? CONSENT_VERSION}`,
      `Verifikations-ID: ${input.applicationId}`,
    ].join("\n"),
  );
  state = drawSpacer(state, 6);
  state = drawBody(
    state,
    "Dieses Dokument ist serverseitig durch einen SHA-256-Integritaets-Hash und " +
      "einen unveraenderbaren (append-only) Audit-Eintrag gegen nachtraegliche " +
      "Manipulation gesichert. Der Hash kann beim Anbieter zur Echtheitspruefung " +
      "gegen diese Datei abgeglichen werden.",
  );
  state = drawSpacer(state, 8);

  if (input.signatureDataUrl) {
    try {
      const base64 = input.signatureDataUrl.split(",")[1] ?? "";
      const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
      const png = await pdfDoc.embedPng(bytes);
      const dims = png.scale(0.45);
      // Hoehe begrenzen, damit der Block auf die Seite passt.
      const maxH = 90;
      const ratio = Math.min(1, maxH / dims.height);
      const w = dims.width * ratio;
      const h = dims.height * ratio;
      if (state.y - h < MARGIN_BOTTOM) {
        state = newPage(state, "Erfolgshonorar & Signatur");
        state = drawSubheading(state, "Digitale Signatur (Fortsetzung)");
      }
      state.page.drawImage(png, {
        x: MARGIN_X,
        y: state.y - h,
        width: w,
        height: h,
      });
      state = drawSpacer(state, h + 6);
      state.page.drawLine({
        start: { x: MARGIN_X, y: state.y },
        end: { x: MARGIN_X + 220, y: state.y },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.55),
      });
      state.page.drawText("Unterschrift des Bevollmaechtigten", {
        x: MARGIN_X,
        y: state.y - 12,
        size: 8,
        font: state.font,
        color: rgb(0.45, 0.45, 0.55),
      });
    } catch (err) {
      // Signatur-Embedding fehlgeschlagen — Fallback ohne Bild.
      state = drawBody(
        state,
        `Signatur-Bild konnte nicht eingebettet werden (${err instanceof Error ? err.message : "unbekannt"}).`,
      );
    }
  } else {
    state = drawBody(state, "(keine handschriftliche Signatur erfasst)");
  }

  return pdfDoc.save();
}
