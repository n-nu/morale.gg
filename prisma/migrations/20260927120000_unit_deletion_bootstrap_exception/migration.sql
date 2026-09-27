CREATE OR REPLACE FUNCTION "validate_commander_membership_consistency_for_unit"(unit_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    commander_id TEXT;
    level_zero_count INTEGER;
    level_zero_user_id TEXT;
    unit_exists BOOLEAN;
BEGIN
    EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM %I."Unit" WHERE "id" = $1)',
        current_schema()
    ) INTO unit_exists USING unit_id;

    IF NOT unit_exists THEN
        RETURN;
    END IF;

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

CREATE OR REPLACE FUNCTION "validate_commander_membership_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    checked_unit_id TEXT;
    commander_id TEXT;
    level_zero_count INTEGER;
    level_zero_user_id TEXT;
    unit_exists BOOLEAN;
BEGIN
    IF TG_TABLE_NAME = 'Unit' THEN
        checked_unit_id := NEW."id";
    ELSIF TG_OP = 'DELETE' THEN
        checked_unit_id := OLD."unitId";
    ELSE
        checked_unit_id := NEW."unitId";
    END IF;

    EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM %I."Unit" WHERE "id" = $1)',
        TG_TABLE_SCHEMA
    ) INTO unit_exists USING checked_unit_id;

    IF NOT unit_exists THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    EXECUTE format(
        'SELECT "commanderUserId" FROM %I."Unit" WHERE "id" = $1',
        TG_TABLE_SCHEMA
    ) INTO commander_id USING checked_unit_id;

    IF commander_id IS NULL THEN
        RAISE EXCEPTION 'Unit % must have a Commander', checked_unit_id;
    END IF;

    EXECUTE format(
        'SELECT COUNT(*), MIN("userId") FROM %I."AuthorizedUserMembership" WHERE "unitId" = $1 AND "authorityLevel" = 0 AND "endedAt" IS NULL',
        TG_TABLE_SCHEMA
    ) INTO level_zero_count, level_zero_user_id USING checked_unit_id;

    IF level_zero_count <> 1 OR level_zero_user_id <> commander_id THEN
        RAISE EXCEPTION 'Unit % Commander must match exactly one active level-0 membership', checked_unit_id;
    END IF;

    IF TG_TABLE_NAME = 'AuthorizedUserMembership' AND TG_OP = 'UPDATE' THEN
        IF OLD."unitId" IS DISTINCT FROM NEW."unitId" THEN
            PERFORM "validate_commander_membership_consistency_for_unit"(OLD."unitId");
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;