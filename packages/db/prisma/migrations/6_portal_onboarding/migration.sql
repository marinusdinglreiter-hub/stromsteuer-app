-- TODO 2.1: Portal-Onboarding (Anleitung, Zugangscode, Erinnerungen).
-- Erzeugt mit prisma migrate diff gegen 5_portal_eingabe.

-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'PORTAL_ZUGANG_GEAENDERT';
ALTER TYPE "AuditEventType" ADD VALUE 'PORTAL_CODE_EINGEGANGEN';
ALTER TYPE "AuditEventType" ADD VALUE 'PORTAL_CODE_EINGELOEST';
ALTER TYPE "AuditEventType" ADD VALUE 'PORTAL_ERINNERUNG';
ALTER TYPE "AuditEventType" ADD VALUE 'PORTAL_RUECKRUF';
-- AlterTable
ALTER TABLE "PortalZugang" ADD COLUMN     "pausiertSeit" TIMESTAMP(3),
ADD COLUMN     "pausierteTage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rueckrufAngefordertAt" TIMESTAMP(3),
ADD COLUMN     "schritteErledigt" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "zugangscodeEingegangenAt" TIMESTAMP(3),
ADD COLUMN     "zugangscodeEnc" TEXT;
