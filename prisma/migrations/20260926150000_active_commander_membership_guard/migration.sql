CREATE OR REPLACE FUNCTION "validate_commander_membership_consistency_for_unit"(unit_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    commander_id TEXT;
    level_zero_count INTEGER;
    level_zero_user_id TEXT;
BEGIN
    EXECUTE format(
        'SELECT "commanderUserId" FROM %I."Unit" WHERE "id" = $1',
        current_schema()
    ) INTO commander_id USING unit_id;

    IF commander_id IS NULL THEN
        RAISE EXCEPTION 'Unit % must have a Commander', unit_id;
    END IF;

    EXECUTE format(
        'SELECT COUNT(*), MIN("userId") FROM %I."AuthorizedUserMembership" WHERE "unitId" = $1 AND "authorityLevel" = 0 AND "endedAt" IS NULL',
        current_schema()
    ) INTO level_zero_count, level_zero_user_id USING unit_id;

    IF level_zero_count <> 1 OR level_zero_user_id <> commander_id THEN
        RAISE EXCEPTION 'Unit % Commander must match exactly one active level-0 membership', unit_id;
    END IF;
END;
$$;

DROP TRIGGER "Membership_commander_consistency_trigger"
ON "AuthorizedUserMembership";

CREATE CONSTRAINT TRIGGER "Membership_commander_consistency_trigger"
AFTER INSERT OR UPDATE OF "userId", "unitId", "authorityLevel", "endedAt" OR DELETE
ON "AuthorizedUserMembership"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_commander_membership_consistency"();
