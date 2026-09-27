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
  HONORAR_FLOOR_EUR,
  HONORAR_QUOTE,
  ENTLASTUNGSSATZ_EUR_PRO_KWH,
  istWirtschaftlich,
  MINDEST_KWH_WIRTSCHAFTLICH,
  SOCKEL_EUR,
  type CalcInput,
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
export { generateMandatPdf, type MandatInput } from "./forms/mandat";
export { CONSENT_VERSION } from "./forms/legalTexts";
export { verifyMandatIntegrity, type MandatIntegrity } from "./forms/verify";
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
