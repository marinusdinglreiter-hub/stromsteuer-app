-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SIGNED', 'PENDING_REVIEW', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditActor" AS ENUM ('CUSTOMER', 'KANZLEI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('APPLICATION_CREATED', 'CALC_UPDATED', 'TRIAGE_UPDATED', 'FIRMA_UPDATED', 'MANDAT_SIGNED', 'APPLICATION_SUBMITTED', 'STATUS_CHANGED', 'DRAFT_EXPIRED');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "antragsjahr" INTEGER,
    "branche" TEXT,
    "geschaetzteKwh" INTEGER,
    "triageKleinsteRechtsperson" BOOLEAN,
    "triageKeineFinanzschwierig" BOOLEAN,
    "triageKeineEuRueckforderung" BOOLEAN,
    "triagePrivatnutzung" BOOLEAN,
    "triagePrivatnutzungKwh" INTEGER,
    "triageEAutoLaden" BOOLEAN,
    "triageEAutoKwh" INTEGER,
    "triageEnergieAnDritte" BOOLEAN,
    "firmenname" TEXT,
    "rechtsform" TEXT,
    "geschaeftsfuehrer" TEXT,
    "vorname" TEXT,
    "nachname" TEXT,
    "telefon" TEXT,
    "strasse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "bruttoKwh" INTEGER,
    "nettoKwh" INTEGER,
    "bruttoErstattung" DECIMAL(12,2),
    "honorar" DECIMAL(12,2),
    "nettoAuszahlung" DECIMAL(12,2),
    "email" TEXT,
    "agbAccepted" BOOLEAN,
    "mandatAccepted" BOOLEAN,
    "vertretungsBerechtigt" BOOLEAN,
    "mandatSignedAt" TIMESTAMP(3),
    "mandatSignerName" TEXT,
    "mandatSignerIp" TEXT,
    "mandatSignerUserAgent" TEXT,
    "signaturePngKey" TEXT,
    "mandatPdfKey" TEXT,
    "kanzleiPaketKey" TEXT,
    "submittedAt" TIMESTAMP(3),
    "hzaDecisionAt" TIMESTAMP(3),
    "hzaAmount" DECIMAL(12,2),
    "payoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lieferstelle" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "firmenname" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "plz" TEXT,
    "hza" TEXT,
    "jahresKwh" INTEGER NOT NULL,
    "belegFileKeys" TEXT[],
    "ocrConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lieferstelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "type" "AuditEventType" NOT NULL,
    "actor" "AuditActor" NOT NULL DEFAULT 'CUSTOMER',
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_sessionToken_key" ON "Application"("sessionToken");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_expiresAt_idx" ON "Application"("expiresAt");

-- CreateIndex
CREATE INDEX "Lieferstelle_applicationId_idx" ON "Lieferstelle"("applicationId");

-- CreateIndex
CREATE INDEX "AuditEvent_applicationId_idx" ON "AuditEvent"("applicationId");

-- CreateIndex
CREATE INDEX "AuditEvent_type_idx" ON "AuditEvent"("type");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Lieferstelle" ADD CONSTRAINT "Lieferstelle_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

