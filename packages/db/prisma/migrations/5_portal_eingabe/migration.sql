-- TODO 2.2: Portal-Eingabeblatt (abgehakte Felder), Eingangsnummer der Einreichung.
-- Erzeugt mit prisma migrate diff gegen 4_beleg.

-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'PORTAL_FELD_ERLEDIGT';
ALTER TYPE "AuditEventType" ADD VALUE 'PORTAL_EINGEREICHT';
-- AlterTable
ALTER TABLE "Antrag" ADD COLUMN     "eingangsnummer" TEXT;
-- CreateTable
CREATE TABLE "PortalFeld" (
    "id" TEXT NOT NULL,
    "antragId" TEXT NOT NULL,
    "feldKey" TEXT NOT NULL,
    "erledigtAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erledigtVon" TEXT,
    CONSTRAINT "PortalFeld_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE UNIQUE INDEX "PortalFeld_antragId_feldKey_key" ON "PortalFeld"("antragId", "feldKey");
-- AddForeignKey
ALTER TABLE "PortalFeld" ADD CONSTRAINT "PortalFeld_antragId_fkey" FOREIGN KEY ("antragId") REFERENCES "Antrag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
