-- Macht die AuditEvent-Tabelle append-only: UPDATE und DELETE werden auf
-- DB-Ebene blockiert. Erfuellt die Geschaeftsregel "Audit-Log unveraenderlich".
--
-- Hinweis (DSGVO): Da AuditEvent per FK ON DELETE CASCADE an Application haengt,
-- blockiert dieser Trigger auch das Loeschen einer Application mit Audit-Historie.
-- Fuer eine kontrollierte Loeschung (Recht auf Vergessenwerden) muss der Trigger
-- innerhalb einer Wartungstransaktion temporaer entfernt werden:
--   DROP TRIGGER audit_event_no_change ON "AuditEvent";  -- scrub ...  -- danach neu anlegen
-- Triggers liegen ausserhalb des Prisma-Schemas und werden von `prisma migrate`
-- nicht angefasst.

CREATE OR REPLACE FUNCTION audit_event_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent ist append-only (% nicht erlaubt)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_no_change
  BEFORE UPDATE OR DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION audit_event_immutable();
