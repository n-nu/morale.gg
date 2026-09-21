CREATE OR REPLACE FUNCTION "validate_unit_root_consistency"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_root TEXT;
    designated_parent TEXT;
BEGIN
    IF TG_TABLE_NAME = 'RootUnit' THEN
        SELECT "parentId", "rootUnitId"
        INTO designated_parent, parent_root
        FROM "Unit"
        WHERE "id" = NEW."unitId";

        IF designated_parent IS NOT NULL THEN
            RAISE EXCEPTION 'RootUnit % must designate a top-level Unit', NEW."unitId";
        END IF;
        IF parent_root IS NOT NULL AND parent_root <> NEW."unitId" THEN
            RAISE EXCEPTION 'RootUnit % conflicts with its Unit rootUnitId', NEW."unitId";
        END IF;
    ELSE
        IF NEW."rootUnitId" IS NULL THEN
            RAISE EXCEPTION 'Unit % must belong to a RootUnit', NEW."id";
        END IF;
        IF NEW."parentId" IS NOT NULL
           AND EXISTS (SELECT 1 FROM "RootUnit" WHERE "unitId" = NEW."id") THEN
            RAISE EXCEPTION 'RootUnit % must remain a top-level Unit', NEW."id";
        END IF;
        IF NOT EXISTS (SELECT 1 FROM "RootUnit" WHERE "unitId" = NEW."rootUnitId") THEN
            RAISE EXCEPTION 'Unit % references an undesignated RootUnit %', NEW."id", NEW."rootUnitId";
        END IF;
        IF NEW."parentId" IS NULL AND NEW."rootUnitId" <> NEW."id" THEN
            RAISE EXCEPTION 'Top-level Unit % must be its own RootUnit', NEW."id";
        END IF;
        IF NEW."parentId" IS NOT NULL THEN
            SELECT "rootUnitId" INTO parent_root FROM "Unit" WHERE "id" = NEW."parentId";
            IF parent_root IS DISTINCT FROM NEW."rootUnitId" THEN
                RAISE EXCEPTION 'Unit % and parent % must share a RootUnit', NEW."id", NEW."parentId";
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;