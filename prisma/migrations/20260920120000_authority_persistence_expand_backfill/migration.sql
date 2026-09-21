-- Expand authority persistence without requiring legacy Units to have Commanders.

CREATE TYPE "Permission" AS ENUM (
    'MANAGE_UNIT',
    'MANAGE_STRUCTURE',
    'MANAGE_ROSTER',
    'REQUEST_EVENT_PARTICIPATION',
    'MANAGE_EVENTS',
    'SUBMIT_AUDITS',
    'MANAGE_AUTHORIZED_USERS'
);

CREATE TYPE "PermissionScope" AS ENUM (
    'SELF',
    'SELF_AND_CHILDREN',
    'SELF_AND_DESCENDANTS'
);

ALTER TABLE "Unit"
    ADD COLUMN "rootUnitId" TEXT,
    ADD COLUMN "commanderUserId" TEXT;

CREATE TABLE "RootUnit" (
    "unitId" TEXT NOT NULL,
    CONSTRAINT "RootUnit_pkey" PRIMARY KEY ("unitId"),
    CONSTRAINT "RootUnit_unitId_fkey"
        FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Designate each existing top-level Unit, then walk the existing hierarchy.
INSERT INTO "RootUnit" ("unitId")
SELECT "id"
FROM "Unit"
WHERE "parentId" IS NULL;

WITH RECURSIVE "unitRoots" ("unitId", "rootUnitId") AS (
    SELECT "id", "id"
    FROM "Unit"
    WHERE "parentId" IS NULL
    UNION ALL
    SELECT child."id", "unitRoots"."rootUnitId"
    FROM "Unit" AS child
    INNER JOIN "unitRoots" ON child."parentId" = "unitRoots"."unitId"
)
UPDATE "Unit" AS unit
SET "rootUnitId" = "unitRoots"."rootUnitId"
FROM "unitRoots"
WHERE unit."id" = "unitRoots"."unitId";

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Unit" WHERE "rootUnitId" IS NULL) THEN
        RAISE EXCEPTION 'RootUnit backfill failed: one or more Units are unreachable from a hierarchy root';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "Unit" AS unit
        LEFT JOIN "RootUnit" AS root ON root."unitId" = unit."rootUnitId"
        WHERE root."unitId" IS NULL
    ) THEN
        RAISE EXCEPTION 'RootUnit backfill failed: one or more Units have no designated RootUnit';
    END IF;
END $$;

ALTER TABLE "Unit"
    ALTER COLUMN "rootUnitId" SET NOT NULL;

ALTER TABLE "Unit"
    ADD CONSTRAINT "Unit_rootUnitId_fkey"
        FOREIGN KEY ("rootUnitId") REFERENCES "RootUnit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "Unit_commanderUserId_fkey"
        FOREIGN KEY ("commanderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Unit_rootUnitId_idx" ON "Unit"("rootUnitId");
CREATE INDEX "Unit_commanderUserId_idx" ON "Unit"("commanderUserId");

CREATE TABLE "AuthorizedUserMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "authorityLevel" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuthorizedUserMembership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AuthorizedUserMembership_authorityLevel_check" CHECK ("authorityLevel" >= 0),
    CONSTRAINT "AuthorizedUserMembership_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuthorizedUserMembership_unitId_fkey"
        FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuthorizedUserMembership_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AuthorizedUserMembership_userId_unitId_key"
    ON "AuthorizedUserMembership"("userId", "unitId");
CREATE INDEX "AuthorizedUserMembership_userId_idx"
    ON "AuthorizedUserMembership"("userId");
CREATE INDEX "AuthorizedUserMembership_unitId_idx"
    ON "AuthorizedUserMembership"("unitId");
CREATE INDEX "AuthorizedUserMembership_unitId_authorityLevel_idx"
    ON "AuthorizedUserMembership"("unitId", "authorityLevel");
CREATE UNIQUE INDEX "AuthorizedUserMembership_one_level_zero_per_unit_key"
    ON "AuthorizedUserMembership"("unitId")
    WHERE "authorityLevel" = 0;

CREATE TABLE "PermissionGrant" (
    "id" TEXT NOT NULL,
    "authorizedUserMembershipId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "scope" "PermissionScope",
    "delegatedFromGrantId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    CONSTRAINT "PermissionGrant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PermissionGrant_scope_check" CHECK (
        ("permission" = 'MANAGE_STRUCTURE' AND "scope" IS NULL)
        OR ("permission" <> 'MANAGE_STRUCTURE' AND "scope" IS NOT NULL)
    ),
    CONSTRAINT "PermissionGrant_delegatedFromGrantId_check"
        CHECK ("delegatedFromGrantId" IS NULL OR "delegatedFromGrantId" <> "id"),
    CONSTRAINT "PermissionGrant_revocation_metadata_check" CHECK (
        ("revokedAt" IS NULL AND "revokedByUserId" IS NULL)
        OR ("revokedAt" IS NOT NULL AND "revokedByUserId" IS NOT NULL)
    ),
    CONSTRAINT "PermissionGrant_membership_fkey"
        FOREIGN KEY ("authorizedUserMembershipId") REFERENCES "AuthorizedUserMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PermissionGrant_delegatedFromGrantId_fkey"
        FOREIGN KEY ("delegatedFromGrantId") REFERENCES "PermissionGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PermissionGrant_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PermissionGrant_revokedByUserId_fkey"
        FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PermissionGrant_authorizedUserMembershipId_idx"
    ON "PermissionGrant"("authorizedUserMembershipId");
CREATE INDEX "PermissionGrant_delegatedFromGrantId_idx"
    ON "PermissionGrant"("delegatedFromGrantId");
CREATE INDEX "PermissionGrant_createdByUserId_idx"
    ON "PermissionGrant"("createdByUserId");
CREATE INDEX "PermissionGrant_revokedByUserId_idx"
    ON "PermissionGrant"("revokedByUserId");
CREATE UNIQUE INDEX "PermissionGrant_ordinary_unique_key"
    ON "PermissionGrant"("authorizedUserMembershipId", "permission", "scope")
    WHERE "permission" <> 'MANAGE_STRUCTURE';
CREATE UNIQUE INDEX "PermissionGrant_structure_unique_key"
    ON "PermissionGrant"("authorizedUserMembershipId")
    WHERE "permission" = 'MANAGE_STRUCTURE';

-- Keep the denormalized root key consistent with the designated top-level Unit.
CREATE FUNCTION "validate_unit_root_consistency"()
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

CREATE CONSTRAINT TRIGGER "Unit_root_consistency_trigger"
AFTER INSERT OR UPDATE OF "parentId", "rootUnitId" ON "Unit"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_unit_root_consistency"();

CREATE CONSTRAINT TRIGGER "RootUnit_root_consistency_trigger"
AFTER INSERT OR UPDATE ON "RootUnit"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "validate_unit_root_consistency"();

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
        RAISE EXCEPTION 'RootUnit consistency validation failed after backfill';
    END IF;
END $$;
