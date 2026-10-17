-- Beleg: eine Zeile je hochgeladener Rechnung mit den gelesenen Werten.
-- Grundlage fuer Summen ueber mehrere Rechnungen (z. B. Monatsrechnungen),
-- Duplikaterkennung per SHA-256 und die Zeitraum-Pruefung im Pruefprotokoll.
-- Handgeschrieben (DB war beim Erstellen nicht erreichbar), entspricht
-- `prisma migrate diff` fuer das Modell Beleg.

ALTER TYPE "AuditEventType" ADD VALUE 'BELEG_ERFASST';

CREATE TABLE "Beleg" (
    "id" TEXT NOT NULL,
    "lieferstelleId" TEXT NOT NULL,
    "antragId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "dateiname" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "kwh" INTEGER,
    "zeitraumVon" TIMESTAMP(3),
    "zeitraumBis" TIMESTAMP(3),
    "stromsteuerEur" DECIMAL(12,2),
    "versorger" TEXT,
    "adresse" TEXT,
    "zaehlpunkt" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "extraktion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Beleg_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Beleg_storageKey_key" ON "Beleg"("storageKey");
CREATE UNIQUE INDEX "Beleg_antragId_sha256_key" ON "Beleg"("antragId", "sha256");
CREATE INDEX "Beleg_lieferstelleId_idx" ON "Beleg"("lieferstelleId");

ALTER TABLE "Beleg" ADD CONSTRAINT "Beleg_lieferstelleId_fkey"
    FOREIGN KEY ("lieferstelleId") REFERENCES "Lieferstelle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
