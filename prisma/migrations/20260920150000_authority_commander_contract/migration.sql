DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Unit" AS unit
        LEFT JOIN "RootUnit" AS root ON root."unitId" = unit."rootUnitId"
        LEFT JOIN "Unit" AS designated ON designated."id" = root."unitId"
        WHERE unit."rootUnitId" IS NULL
           OR root."unitId" IS NULL
           OR designated."parentId" IS NOT NULL
           OR (unit."parentId" IS NULL AND unit."rootUnitId" <> unit."id")
           OR (unit."parentId" IS NOT NULL AND designated."rootUnitId" <> unit."rootUnitId")
    ) THEN
        RAISE EXCEPTION 'Cannot activate Commander contract: RootUnit consistency is invalid';
    END IF;

    IF EXISTS (SELECT 1 FROM "Unit" WHERE "commanderUserId" IS NULL) THEN
        RAISE EXCEPTION 'Cannot activate Commander contract: one or more Units have no Commander';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "Unit" AS unit
        LEFT JOIN "User" AS commander ON commander."id" = unit."commanderUserId"
        WHERE commander."id" IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot activate Commander contract: a Commander User does not exist';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "Unit" AS unit
        LEFT JOIN "AuthorizedUserMembership" AS membership
          ON membership."unitId" = unit."id" AND membership."authorityLevel" = 0
        GROUP BY unit."id", unit."commanderUserId"
        HAVING COUNT(membership."id") <> 1
            OR MIN(membership."userId") <> MIN(unit."commanderUserId")
    ) THEN
        RAISE EXCEPTION 'Cannot activate Commander contract: Commander and level-0 membership do not match';
    END IF;
END $$;

ALTER TABLE "Unit"
    ALTER COLUMN "commanderUserId" SET NOT NULL;

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

    IF TG_TABLE_NAME = 'AuthorizedUserMembership'
       AND TG_OP = 'UPDATE'
       AND OLD."unitId" IS DISTINCT FROM NEW."unitId" THEN
        PERFORM "validate_commander_membership_consistency_for_unit"(OLD."unitId");
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION "validate_commander_membership_consistency_for_unit"(unit_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    commander_id TEXT;
    level_zero_count INTEGER;
    level_zero_user_id TEXT;
BEGIN
    SELECT "commanderUserId" INTO commander_id FROM "Unit" WHERE "id" = unit_id;
    IF commander_id IS NULL THEN
        RAISE EXCEPTION 'Unit % must have a Commander', unit_id;
    END IF;

    SELECT COUNT(*), MIN("userId")
    INTO level_zero_count, level_zero_user_id
    FROM "AuthorizedUserMembership"
    WHERE "unitId" = unit_id AND "authorityLevel" = 0;

    IF level_zero_count <> 1 OR level_zero_user_id <> commander_id THEN
        RAISE EXCEPTION 'Unit % Commander must match exactly one level-0 membership', unit_id;
    END IF;
END;
$$;

CREATE CONSTRAINT TRIGGER "Unit_commander_membership_consistency_trigger"
AFTER INSERT OR UPDATE OF "commanderUserId" ON "Unit"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_commander_membership_consistency"();

CREATE CONSTRAINT TRIGGER "Membership_commander_consistency_trigger"
AFTER INSERT OR UPDATE OF "userId", "unitId", "authorityLevel" OR DELETE
ON "AuthorizedUserMembership"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_commander_membership_consistency"();