export { appRouter, type AppCaller, type AppRouter } from "./router";
export {
  createContext,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  type Context,
  type CreateContextOptions,
} from "./context";
export {
  calculateErstattung,
  ENTLASTUNGS_SAETZE,
  istWirtschaftlich,
  MINDEST_KWH_WIRTSCHAFTLICH,
  satzFuer,
  type CalcInput,
  type EntlastungsSatz,
  type CalcResult,
} from "./calc/stromsteuer";
export {
  folgejahrPreis,
  PREIS_TABELLEN,
  preisFuer,
  preisTabelle,
  type PreisBand,
  type PreisErgebnis,
  type PreisTabelle,
} from "./calc/preise";
export {
  istOcrVertrauenswuerdig,
  OCR_CONFIDENCE_THRESHOLD,
  parseStromrechnung,
  type ParsedBeleg,
} from "./ocr/parser";
export { isOcrAvailable, ocrStromrechnung } from "./ocr/textract";
export { isPdfFile, ocrPdfLokal } from "./ocr/pdf-local";
export {
  deleteBelege,
  deleteGenerated,
  getBelegDownloadUrl,
  getGeneratedDownloadUrl,
  uploadBeleg,
  uploadGenerated,
} from "./storage/supabase";
export {
  generateAufbereitungsvertragPdf,
  generateKanzleimandatPdf,
  type AufbereitungsvertragInput,
  type KanzleimandatInput,
} from "./forms/vertraege";
export {
  generateDatenblatt,
  type DatenblattErgebnis,
} from "./forms/datenblatt";
export { erzeugeDatenblattFuerAntrag, ladeAntrag } from "./antrag-service";
export { CONSENT_VERSION } from "./forms/legalTexts";
export {
  verifyMandatIntegrity,
  type MandatIntegrity,
  type Vertrag,
} from "./forms/verify";
export {
  generateKanzleiPaket,
  type KanzleiPaketInput,
} from "./forms/kanzleiPaket";
export {
  isEmailConfigured,
  sendMail,
  type SendMailInput,
  type SendMailResult,
} from "./email/client";
export {
  renderAntragBestaetigt,
  renderNeuerAntragKanzlei,
  type AntragBestaetigtInput,
  type NeuerAntragKanzleiInput,
} from "./email/templates";
