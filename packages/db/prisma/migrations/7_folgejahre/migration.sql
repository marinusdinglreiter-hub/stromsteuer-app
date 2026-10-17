-- TODO 2.3: Folgejahre (Vorjahres-Kopie, Januar-Erinnerung).
-- Erzeugt mit prisma migrate diff gegen 6_portal_onboarding.

-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'FOLGEJAHR_GESTARTET';
ALTER TYPE "AuditEventType" ADD VALUE 'FOLGEJAHR_ERINNERUNG';
-- AlterTable
ALTER TABLE "Mandant" ADD COLUMN     "folgejahrErinnertFuer" INTEGER;
