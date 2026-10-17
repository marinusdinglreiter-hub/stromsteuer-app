-- TODO 2.4: Kontakthistorie am Mandanten.
-- Erzeugt mit prisma migrate diff gegen 7_folgejahre.

-- CreateEnum
CREATE TYPE "KontaktKanal" AS ENUM ('EMAIL', 'TELEFON', 'NOTIZ', 'PORTAL');
-- CreateEnum
CREATE TYPE "KontaktRichtung" AS ENUM ('AUSGEHEND', 'EINGEHEND', 'INTERN');
-- CreateTable
CREATE TABLE "Kontakt" (
    "id" TEXT NOT NULL,
    "mandantId" TEXT NOT NULL,
    "antragId" TEXT,
    "kanal" "KontaktKanal" NOT NULL,
    "richtung" "KontaktRichtung" NOT NULL,
    "betreff" TEXT NOT NULL,
    "text" TEXT,
    "automatisch" BOOLEAN NOT NULL DEFAULT false,
    "erstelltVon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Kontakt_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Kontakt_mandantId_createdAt_idx" ON "Kontakt"("mandantId", "createdAt");
-- AddForeignKey
ALTER TABLE "Kontakt" ADD CONSTRAINT "Kontakt_mandantId_fkey" FOREIGN KEY ("mandantId") REFERENCES "Mandant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
