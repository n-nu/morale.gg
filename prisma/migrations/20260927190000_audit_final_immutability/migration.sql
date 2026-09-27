CREATE OR REPLACE FUNCTION prevent_final_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' OR OLD.lifecycle = 'FINAL' THEN
        RAISE EXCEPTION 'Finalized Audits are immutable and cannot be edited or deleted';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_final_immutability
BEFORE UPDATE OR DELETE ON "Audit"
FOR EACH ROW
EXECUTE FUNCTION prevent_final_audit_mutation();

CREATE OR REPLACE FUNCTION prevent_final_audit_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    audit_lifecycle "AuditLifecycle";
BEGIN
    SELECT "lifecycle" INTO audit_lifecycle FROM "Audit" WHERE "id" = COALESCE(NEW."auditId", OLD."auditId");
    IF audit_lifecycle = 'FINAL' THEN
        RAISE EXCEPTION 'Finalized Audit results and roles are immutable';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_player_result_final_immutability
BEFORE INSERT OR UPDATE OR DELETE ON "AuditPlayerResult"
FOR EACH ROW
EXECUTE FUNCTION prevent_final_audit_child_mutation();

CREATE TRIGGER audit_role_assignment_final_immutability
BEFORE INSERT OR UPDATE OR DELETE ON "AuditRoleAssignment"
FOR EACH ROW
EXECUTE FUNCTION prevent_final_audit_child_mutation();
