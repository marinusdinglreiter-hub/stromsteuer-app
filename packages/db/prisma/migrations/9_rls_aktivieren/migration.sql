-- TODO 3 "Bucket privat + RLS": Supabase stellt jede Tabelle im Schema public
-- per PostgREST unter dem oeffentlichen anon-Schluessel bereit, solange Row Level
-- Security aus ist und anon/authenticated Rechte haben. Das waere ein offener
-- Zugriff auf Mandanten, IBANs, Steuernummern und Belege.
--
-- Die App greift ausschliesslich ueber Prisma (Rolle postgres, umgeht RLS) und
-- den Service-Role-Key zu. Deshalb: RLS an allen Tabellen ohne jede Policy
-- (alles fuer anon/authenticated verboten) und die Rechte entziehen.
-- Neue Tabellen in kuenftigen Migrationen brauchen dieselben zwei Zeilen.

ALTER TABLE "Antrag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Beleg" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Kontakt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lieferstelle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mandant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NutzenergieEmpfaenger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalFeld" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PortalZugang" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Rollen gibt es nur auf Supabase; auf einer normalen Postgres-Instanz entfaellt der Block.
DO $$
DECLARE
  rolle text;
BEGIN
  FOREACH rolle IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rolle) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', rolle);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', rolle);
    END IF;
  END LOOP;
END
$$;
