-- TODO 1.1 / 1.4: Mandant, Bankverbindung, dreigeteilte Mengen (Formular 1453 Seite 2),
-- Nutzenergie-Empfaenger, Portal-Zugang, zwei getrennte Vertraege.
--
-- Handgeschrieben statt `prisma migrate diff`: Prisma wuerde die Tabelle Application
-- droppen und Antrag neu anlegen. Hier wird umbenannt, damit der unveraenderliche
-- Audit-Trail und vorhandene Testdaten erhalten bleiben. RENAME/ADD/DROP COLUMN loest
-- den UPDATE/DELETE-Trigger aus 1_audit_immutable nicht aus.

-- Neue Enums
CREATE TYPE "Unternehmensart" AS ENUM ('PRODUZIERENDES_GEWERBE', 'LAND_FORSTWIRTSCHAFT');
CREATE TYPE "Entlastungsabschnitt" AS ENUM ('KALENDERJAHR', 'HALBJAHR', 'QUARTAL', 'MONAT');
CREATE TYPE "BeschreibungStatus" AS ENUM ('BEREITS_VORGELEGT', 'LIEGT_BEI');
CREATE TYPE "ElsterStatus" AS ENUM ('UNBEKANNT', 'VORHANDEN', 'BEIM_STB', 'FEHLT', 'BEANTRAGT');
CREATE TYPE "PortalKontoStatus" AS ENUM ('OFFEN', 'REGISTRIERT');
CREATE TYPE "VollmachtStatus" AS ENUM ('OFFEN', 'ERTEILT', 'CODE_EINGELOEST', 'AKTIV', 'ABGELAUFEN', 'SCOPE_FALSCH');

ALTER TYPE "AuditEventType" ADD VALUE 'AUFBEREITUNG_SIGNED';
ALTER TYPE "AuditEventType" ADD VALUE 'KANZLEIMANDAT_SIGNED';
ALTER TYPE "AuditEventType" ADD VALUE 'DATENBLATT_ERZEUGT';

-- Application -> Antrag
ALTER TYPE "ApplicationStatus" RENAME TO "AntragStatus";
ALTER TABLE "Application" RENAME TO "Antrag";
ALTER TABLE "Antrag" RENAME CONSTRAINT "Application_pkey" TO "Antrag_pkey";
ALTER INDEX "Application_sessionToken_key" RENAME TO "Antrag_sessionToken_key";
ALTER INDEX "Application_status_idx" RENAME TO "Antrag_status_idx";
ALTER INDEX "Application_expiresAt_idx" RENAME TO "Antrag_expiresAt_idx";

-- Mandant
CREATE TABLE "Mandant" (
    "id" TEXT NOT NULL,
    "firmenname" TEXT NOT NULL,
    "rechtsform" TEXT,
    "geschaeftsfuehrer" TEXT,
    "vorname" TEXT,
    "nachname" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "strasse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "steuernummer" TEXT,
    "ustIdNr" TEXT,
    "handelsregister" TEXT,
    "wzCode" TEXT,
    "unternehmensnummer" TEXT,
    "hauptzollamt" TEXT,
    "kontoinhaber" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "unternehmensart" "Unternehmensart",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Mandant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Antrag" ADD COLUMN "mandantId" TEXT;

-- Firmendaten vorhandener Antraege in je einen Mandanten uebernehmen (1:1)
INSERT INTO "Mandant" ("id", "firmenname", "rechtsform", "geschaeftsfuehrer", "vorname",
  "nachname", "email", "telefon", "strasse", "plz", "ort", "createdAt", "updatedAt")
SELECT 'm_' || "id", "firmenname", "rechtsform", "geschaeftsfuehrer", "vorname",
  "nachname", "email", "telefon", "strasse", "plz", "ort", "createdAt", CURRENT_TIMESTAMP
FROM "Antrag" WHERE "firmenname" IS NOT NULL;
UPDATE "Antrag" SET "mandantId" = 'm_' || "id" WHERE "firmenname" IS NOT NULL;

ALTER TABLE "Antrag"
  DROP COLUMN "firmenname",
  DROP COLUMN "rechtsform",
  DROP COLUMN "geschaeftsfuehrer",
  DROP COLUMN "vorname",
  DROP COLUMN "nachname",
  DROP COLUMN "telefon",
  DROP COLUMN "strasse",
  DROP COLUMN "plz",
  DROP COLUMN "ort",
  DROP COLUMN "email",
  DROP COLUMN "honorar",
  DROP COLUMN "nettoAuszahlung",
  ADD COLUMN "entlastungsabschnitt" "Entlastungsabschnitt" NOT NULL DEFAULT 'KALENDERJAHR',
  ADD COLUMN "schaetzungNach17b" BOOLEAN,
  ADD COLUMN "beschreibungTaetigkeitVorgelegt" "BeschreibungStatus",
  ADD COLUMN "stromAnDritteGeleistet" BOOLEAN,
  ADD COLUMN "nutzenergieAnDritteWeitergegeben" BOOLEAN,
  ADD COLUMN "entnahmeDurchDritten" BOOLEAN,
  ADD COLUMN "beihilfeSelbsterklaerungVorhanden" BOOLEAN,
  ADD COLUMN "preisEur" DECIMAL(12,2),
  ADD COLUMN "preisTabelleVersion" TEXT,
  ADD COLUMN "istFolgejahr" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aufbereitungAccepted" BOOLEAN,
  ADD COLUMN "aufbereitungSignedAt" TIMESTAMP(3),
  ADD COLUMN "aufbereitungSignaturePngKey" TEXT,
  ADD COLUMN "aufbereitungPdfKey" TEXT,
  ADD COLUMN "aufbereitungPdfSha256" TEXT;

-- Das bisherige Einheits-Mandat entspricht dem Kanzleimandat
ALTER TABLE "Antrag" RENAME COLUMN "mandatAccepted" TO "kanzleimandatAccepted";
ALTER TABLE "Antrag" RENAME COLUMN "mandatSignedAt" TO "kanzleimandatSignedAt";
ALTER TABLE "Antrag" RENAME COLUMN "signaturePngKey" TO "kanzleimandatSignaturePngKey";
ALTER TABLE "Antrag" RENAME COLUMN "mandatPdfKey" TO "kanzleimandatPdfKey";
ALTER TABLE "Antrag" RENAME COLUMN "mandatPdfSha256" TO "kanzleimandatPdfSha256";

CREATE INDEX "Antrag_mandantId_idx" ON "Antrag"("mandantId");
ALTER TABLE "Antrag" ADD CONSTRAINT "Antrag_mandantId_fkey" FOREIGN KEY ("mandantId")
  REFERENCES "Mandant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lieferstelle
ALTER TABLE "Lieferstelle" RENAME COLUMN "applicationId" TO "antragId";
ALTER TABLE "Lieferstelle" RENAME COLUMN "jahresKwh" TO "kwhEigenbetrieblich";
ALTER TABLE "Lieferstelle" RENAME CONSTRAINT "Lieferstelle_applicationId_fkey" TO "Lieferstelle_antragId_fkey";
ALTER INDEX "Lieferstelle_applicationId_idx" RENAME TO "Lieferstelle_antragId_idx";
ALTER TABLE "Lieferstelle"
  ADD COLUMN "kwhNutzenergiePG" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "kwhNutzenergieLuF" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "versorger" TEXT,
  ADD COLUMN "zeitraumVon" TIMESTAMP(3),
  ADD COLUMN "zeitraumBis" TIMESTAMP(3),
  ADD COLUMN "stromsteuerGezahltEur" DECIMAL(12,2);

-- AuditEvent
ALTER TABLE "AuditEvent" RENAME COLUMN "applicationId" TO "antragId";
ALTER TABLE "AuditEvent" RENAME CONSTRAINT "AuditEvent_applicationId_fkey" TO "AuditEvent_antragId_fkey";
ALTER INDEX "AuditEvent_applicationId_idx" RENAME TO "AuditEvent_antragId_idx";

-- NutzenergieEmpfaenger
CREATE TABLE "NutzenergieEmpfaenger" (
    "id" TEXT NOT NULL,
    "antragId" TEXT NOT NULL,
    "firmenname" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "kategorie" "Unternehmensart" NOT NULL,
    "mengeKwh" INTEGER NOT NULL,
    "selbsterklaerungVorhanden" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "NutzenergieEmpfaenger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NutzenergieEmpfaenger_antragId_idx" ON "NutzenergieEmpfaenger"("antragId");
ALTER TABLE "NutzenergieEmpfaenger" ADD CONSTRAINT "NutzenergieEmpfaenger_antragId_fkey"
  FOREIGN KEY ("antragId") REFERENCES "Antrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PortalZugang
CREATE TABLE "PortalZugang" (
    "id" TEXT NOT NULL,
    "mandantId" TEXT NOT NULL,
    "elsterStatus" "ElsterStatus" NOT NULL DEFAULT 'UNBEKANNT',
    "portalKontoStatus" "PortalKontoStatus" NOT NULL DEFAULT 'OFFEN',
    "vollmachtStatus" "VollmachtStatus" NOT NULL DEFAULT 'OFFEN',
    "beteiligtenNummer" TEXT,
    "zugangscodeEingeloestAt" TIMESTAMP(3),
    "scopeGeprueftAt" TIMESTAMP(3),
    "scopeGeprueftVon" TEXT,
    "bescheidZustellungAktiv" BOOLEAN NOT NULL DEFAULT false,
    "eskalationsstufe" INTEGER NOT NULL DEFAULT 0,
    "letzteErinnerungAt" TIMESTAMP(3),
    "notizen" TEXT,
    CONSTRAINT "PortalZugang_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortalZugang_mandantId_key" ON "PortalZugang"("mandantId");
ALTER TABLE "PortalZugang" ADD CONSTRAINT "PortalZugang_mandantId_fkey"
  FOREIGN KEY ("mandantId") REFERENCES "Mandant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
