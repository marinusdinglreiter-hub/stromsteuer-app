/**
 * Die zwei getrennten Vertrags-PDFs (TODO 1.4):
 *
 *   - Aufbereitungsvertrag: unser Vertrag, Festpreis nach Verbrauchsband,
 *     keine Zusage eines Erstattungserfolgs.
 *   - Kanzleimandat: Mandat und Vollmacht fuer die Partnerkanzlei inkl.
 *     Hinweis auf die Bescheidzustellung ins Portal-Profil der Kanzlei.
 *
 * Rechtlich zwei Willenserklaerungen, deshalb zwei Dokumente mit je eigener
 * Signatur. Die Texte sind Platzhalter (siehe legalTexts.ts).
 */

import { CLAUSES, CONSENT_VERSION, renderClause } from "./legalTexts";
import {
  datum,
  drawBody,
  drawHeading,
  drawSignatureBlock,
  drawSpacer,
  drawSubheading,
  eur,
  newPage,
  startDocument,
} from "./pdfLayout";

export type VertragsPartei = {
  firmenname: string;
  rechtsform: string;
  geschaeftsfuehrer: string;
  strasse: string;
  plz: string;
  ort: string;
  email: string;
};

export type Signatur = {
  signerName: string;
  signerIp: string | null;
  signedAt: Date;
  /** "data:image/png;base64,..." aus dem Canvas. */
  signatureDataUrl: string | null;
  consentVersion?: string;
};

export type AufbereitungsvertragInput = {
  antragId: string;
  antragsjahr: number;
  mandant: VertragsPartei;
  anbieterName: string;
  /** null = individuelles Angebot (ueber 3.000 MWh) */
  preisEur: number | null;
  preisTabelleVersion: string;
  istFolgejahr: boolean;
  signatur: Signatur;
};

export type KanzleimandatInput = {
  antragId: string;
  antragsjahr: number;
  mandant: VertragsPartei;
  kanzleiName: string;
  kanzleiAnwalt: string;
  signatur: Signatur;
};

function parteiZeilen(p: VertragsPartei): string[] {
  return [
    `${p.firmenname} (${p.rechtsform})`,
    `Vertreten durch: ${p.geschaeftsfuehrer}`,
    `${p.strasse}, ${p.plz} ${p.ort}`,
    `E-Mail: ${p.email}`,
  ];
}

export async function generateAufbereitungsvertragPdf(
  input: AufbereitungsvertragInput,
): Promise<Uint8Array> {
  const { signatur } = input;
  let state = await startDocument({
    title: `Aufbereitungsvertrag ${input.mandant.firmenname} — § 9b StromStG`,
    author: input.anbieterName,
    createdAt: signatur.signedAt,
    header: `Aufbereitungsvertrag — ${input.mandant.firmenname}`,
  });

  state = drawHeading(state, "Vertrag ueber die Aufbereitung");
  state = drawBody(
    state,
    [
      `Datum: ${datum(signatur.signedAt)}`,
      `Vorgang: ${input.antragId}`,
      "",
      "Auftraggeber:",
      ...parteiZeilen(input.mandant),
      "",
      "Auftragnehmer:",
      input.anbieterName,
    ].join("\n"),
  );
  state = drawSpacer(state, 8);

  state = drawSubheading(state, "§ 1 Leistung");
  state = drawBody(
    state,
    renderClause(CLAUSES.aufbereitungLeistung, { antragsjahr: input.antragsjahr }),
  );
  state = drawSpacer(state, 6);

  state = drawSubheading(state, "§ 2 Pflichten des Auftraggebers");
  state = drawBody(state, CLAUSES.pflichtenDesMandanten);
  state = drawSpacer(state, 6);

  state = drawSubheading(state, "§ 3 Preis");
  state = drawBody(state, CLAUSES.festpreis);
  state = drawSpacer(state, 4);
  state = drawBody(
    state,
    [
      input.preisEur !== null
        ? `Festpreis: ${eur(input.preisEur)} zzgl. gesetzlicher Umsatzsteuer`
        : "Festpreis: nach individuellem Angebot",
      `Preistabelle: Version ${input.preisTabelleVersion}`,
      input.istFolgejahr ? "Folgeantrag: ermaessigter Preis fuer Bestandskunden" : "",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  );
  state = drawSpacer(state, 6);

  state = drawSubheading(state, "§ 4 Datenschutz");
  state = drawBody(
    state,
    "Daten werden EU-konform verarbeitet (DSGVO). Details siehe Datenschutzerklaerung.",
  );

  state = await drawSignatureBlock(state, {
    ...signatur,
    consentVersion: signatur.consentVersion ?? CONSENT_VERSION,
    verifikationsId: input.antragId,
    unterschriftLabel: "Unterschrift des Auftraggebers",
  });

  return state.pdfDoc.save();
}

export async function generateKanzleimandatPdf(
  input: KanzleimandatInput,
): Promise<Uint8Array> {
  const { signatur } = input;
  let state = await startDocument({
    title: `Mandat ${input.mandant.firmenname} — § 9b StromStG`,
    author: input.kanzleiName,
    createdAt: signatur.signedAt,
    header: `Mandatsvereinbarung — ${input.mandant.firmenname}`,
  });

  state = drawHeading(state, "Mandatsvereinbarung");
  state = drawBody(
    state,
    [
      `Datum: ${datum(signatur.signedAt)}`,
      `Vorgang: ${input.antragId}`,
      "",
      "Mandant:",
      ...parteiZeilen(input.mandant),
      "",
      "Mandatsnehmer:",
      input.kanzleiName,
      `Rechtsanwalt: ${input.kanzleiAnwalt}`,
    ].join("\n"),
  );
  state = drawSpacer(state, 8);

  state = drawSubheading(state, "§ 1 Mandatsgegenstand");
  state = drawBody(
    state,
    renderClause(CLAUSES.mandatsgegenstand, { antragsjahr: input.antragsjahr }),
  );
  state = drawSpacer(state, 6);
  state = drawSubheading(state, "§ 2 Pflichten des Mandanten");
  state = drawBody(state, CLAUSES.pflichtenDesMandanten);
  state = drawSpacer(state, 6);
  state = drawSubheading(state, "§ 3 Verschwiegenheit und Datenschutz");
  state = drawBody(state, CLAUSES.verschwiegenheit);
  state = drawSpacer(state, 6);
  state = drawSubheading(state, "§ 4 Bescheidzustellung");
  state = drawBody(state, CLAUSES.bescheidzustellung);
  state = drawSpacer(state, 6);
  state = drawSubheading(state, "§ 5 Verguetung");
  state = drawBody(
    state,
    "[JURISTISCH ZU PRUEFEN] Die Verguetung der Kanzlei richtet sich nach gesonderter " +
      "Vereinbarung mit der Kanzlei und wird von dieser direkt in Rechnung gestellt.",
  );

  state = newPage(state, "Vollmacht");
  state = drawHeading(state, "Vollmacht");
  state = drawBody(
    state,
    [
      `Hiermit bevollmaechtige ich, ${input.mandant.firmenname} (${input.mandant.rechtsform}),`,
      `vertreten durch ${input.mandant.geschaeftsfuehrer},`,
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

  state = await drawSignatureBlock(state, {
    ...signatur,
    consentVersion: signatur.consentVersion ?? CONSENT_VERSION,
    verifikationsId: input.antragId,
    unterschriftLabel: "Unterschrift des Vollmachtgebers",
  });

  return state.pdfDoc.save();
}
