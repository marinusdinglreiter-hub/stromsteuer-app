/**
 * Gemeinsames A4-Layout fuer die Vertrags-PDFs (Aufbereitungsvertrag,
 * Kanzleimandat). Reines Zeichnen mit pdf-lib, keine Texte.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export const A4 = { width: 595.28, height: 841.89 };
const MARGIN_X = 56;
const MARGIN_TOP = 80;
const MARGIN_BOTTOM = 60;
const BODY_FONT_SIZE = 10.5;
const HEADING_FONT_SIZE = 16;
const SUBHEADING_FONT_SIZE = 12;
const LINE_HEIGHT = 14;

export function eur(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export function datum(d: Date): string {
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

export type DrawState = {
  page: PDFPage;
  y: number;
  pdfDoc: PDFDocument;
  font: PDFFont;
  fontBold: PDFFont;
  pageIndex: number;
  /** Kopfzeile fuer Folgeseiten. */
  header: string;
};

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

/** Legt ein neues Dokument mit erster Seite an. */
export async function startDocument(opts: {
  title: string;
  author: string;
  createdAt: Date;
  header: string;
}): Promise<DrawState> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  pdfDoc.setTitle(opts.title);
  pdfDoc.setAuthor(opts.author);
  pdfDoc.setCreator("Stromsteuer-Erstattung");
  pdfDoc.setCreationDate(opts.createdAt);

  const page = pdfDoc.addPage([A4.width, A4.height]);
  drawHeader(page, fontBold, font, opts.header, 1);
  return {
    page,
    y: A4.height - MARGIN_TOP,
    pdfDoc,
    font,
    fontBold,
    pageIndex: 0,
    header: opts.header,
  };
}

export function newPage(state: DrawState, header: string = state.header): DrawState {
  const page = state.pdfDoc.addPage([A4.width, A4.height]);
  drawHeader(page, state.fontBold, state.font, header, state.pageIndex + 2);
  return {
    ...state,
    page,
    y: A4.height - MARGIN_TOP,
    pageIndex: state.pageIndex + 1,
    header,
  };
}

export function drawHeading(state: DrawState, text: string): DrawState {
  if (state.y < MARGIN_BOTTOM + 40) state = newPage(state);
  state.page.drawText(text, {
    x: MARGIN_X,
    y: state.y,
    size: HEADING_FONT_SIZE,
    font: state.fontBold,
    color: rgb(0.08, 0.1, 0.18),
  });
  return { ...state, y: state.y - HEADING_FONT_SIZE - 8 };
}

export function drawSubheading(state: DrawState, text: string): DrawState {
  if (state.y < MARGIN_BOTTOM + 40) state = newPage(state);
  state.page.drawText(text, {
    x: MARGIN_X,
    y: state.y,
    size: SUBHEADING_FONT_SIZE,
    font: state.fontBold,
    color: rgb(0.15, 0.18, 0.3),
  });
  return { ...state, y: state.y - SUBHEADING_FONT_SIZE - 4 };
}

export function drawBody(state: DrawState, text: string): DrawState {
  const maxWidth = A4.width - 2 * MARGIN_X;
  const lines = wrap(text, state.font, BODY_FONT_SIZE, maxWidth);
  let current = state;
  for (const line of lines) {
    if (current.y < MARGIN_BOTTOM) current = newPage(current);
    current.page.drawText(line, {
      x: MARGIN_X,
      y: current.y,
      size: BODY_FONT_SIZE,
      font: current.font,
      color: rgb(0.1, 0.12, 0.2),
    });
    current = { ...current, y: current.y - LINE_HEIGHT };
  }
  return { ...current, y: current.y - 4 };
}

export function drawSpacer(state: DrawState, height: number): DrawState {
  return { ...state, y: state.y - height };
}

/**
 * Signaturblock: Metadaten, Integritaetshinweis und das Canvas-PNG.
 */
export async function drawSignatureBlock(
  state: DrawState,
  opts: {
    signerName: string;
    signedAt: Date;
    signerIp: string | null;
    consentVersion: string;
    verifikationsId: string;
    signatureDataUrl: string | null;
    unterschriftLabel: string;
  },
): Promise<DrawState> {
  state = drawSpacer(state, 16);
  state = drawSubheading(state, "Digitale Signatur");
  state = drawBody(
    state,
    [
      `Vollstaendiger Name: ${opts.signerName}`,
      `Unterschrieben am: ${datum(opts.signedAt)}`,
      `IP-Adresse: ${opts.signerIp ?? "—"}`,
      `Einwilligungs-Version: ${opts.consentVersion}`,
      `Verifikations-ID: ${opts.verifikationsId}`,
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

  if (!opts.signatureDataUrl) {
    return drawBody(state, "(keine handschriftliche Signatur erfasst)");
  }
  try {
    const base64 = opts.signatureDataUrl.split(",")[1] ?? "";
    const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
    const png = await state.pdfDoc.embedPng(bytes);
    const dims = png.scale(0.45);
    const maxH = 90;
    const ratio = Math.min(1, maxH / dims.height);
    const w = dims.width * ratio;
    const h = dims.height * ratio;
    if (state.y - h < MARGIN_BOTTOM) {
      state = newPage(state);
      state = drawSubheading(state, "Digitale Signatur (Fortsetzung)");
    }
    state.page.drawImage(png, { x: MARGIN_X, y: state.y - h, width: w, height: h });
    state = drawSpacer(state, h + 6);
    state.page.drawLine({
      start: { x: MARGIN_X, y: state.y },
      end: { x: MARGIN_X + 220, y: state.y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.55),
    });
    state.page.drawText(opts.unterschriftLabel, {
      x: MARGIN_X,
      y: state.y - 12,
      size: 8,
      font: state.font,
      color: rgb(0.45, 0.45, 0.55),
    });
    return drawSpacer(state, 20);
  } catch (err) {
    return drawBody(
      state,
      `Signatur-Bild konnte nicht eingebettet werden (${err instanceof Error ? err.message : "unbekannt"}).`,
    );
  }
}
