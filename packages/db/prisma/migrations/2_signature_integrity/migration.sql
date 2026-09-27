-- Signatur-Integritaet: Hash der Mandat-PDF, Einwilligungs-Versionierung und
-- Reserve fuer einen optionalen RFC-3161-Zeitstempel. Alle Felder nullable,
-- damit die Migration bestehende Zeilen nicht beruehrt.
ALTER TABLE "Application" ADD COLUMN "mandatPdfSha256" TEXT;
ALTER TABLE "Application" ADD COLUMN "consentVersion" TEXT;
ALTER TABLE "Application" ADD COLUMN "consentTextSha256" TEXT;
ALTER TABLE "Application" ADD COLUMN "mandatTimestampKey" TEXT;
