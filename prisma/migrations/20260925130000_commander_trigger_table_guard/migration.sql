CREATE OR REPLACE FUNCTION "validate_commander_membership_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    checked_unit_id TEXT;
    commander_id TEXT;
    level_zero_count INTEGER;
    level_zero_user_id TEXT;
BEGIN
    IF TG_TABLE_NAME = 'Unit' THEN
        checked_unit_id := NEW."id";
    ELSIF TG_OP = 'DELETE' THEN
        checked_unit_id := OLD."unitId";
    ELSE
        checked_unit_id := NEW."unitId";
    END IF;

    SELECT "commanderUserId"
    INTO commander_id
    FROM "Unit"
    WHERE "id" = checked_unit_id;

    IF commander_id IS NULL THEN
        RAISE EXCEPTION 'Unit % must have a Commander', checked_unit_id;
    END IF;

    SELECT COUNT(*), MIN("userId")
    INTO level_zero_count, level_zero_user_id
    FROM "AuthorizedUserMembership"
    WHERE "unitId" = checked_unit_id AND "authorityLevel" = 0;

    IF level_zero_count <> 1 OR level_zero_user_id <> commander_id THEN
        RAISE EXCEPTION 'Unit % Commander must match exactly one level-0 membership', checked_unit_id;
    END IF;

    -- Unit rows have no unitId field. Guard the table before accessing that field;
    -- SQL boolean expressions do not guarantee short-circuit evaluation.
    IF TG_TABLE_NAME = 'AuthorizedUserMembership' THEN
        IF TG_OP = 'UPDATE' THEN
            IF OLD."unitId" IS DISTINCT FROM NEW."unitId" THEN
                PERFORM "validate_commander_membership_consistency_for_unit"(OLD."unitId");
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;
