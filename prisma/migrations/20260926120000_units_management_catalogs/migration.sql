ALTER TABLE "Unit"
    ADD COLUMN "description" TEXT,
    ADD COLUMN "imageRef" TEXT,
    ADD COLUMN "discordInvite" TEXT,
    ADD COLUMN "groupLink" TEXT;

ALTER TABLE "AuthorizedUserMembership"
    ADD COLUMN "endedAt" TIMESTAMP(3);

DROP INDEX "AuthorizedUserMembership_userId_unitId_key";

CREATE UNIQUE INDEX "AuthorizedUserMembership_active_userId_unitId_key"
    ON "AuthorizedUserMembership"("userId", "unitId")
    WHERE "endedAt" IS NULL;

DROP INDEX "AuthorizedUserMembership_one_level_zero_per_unit_key";

CREATE UNIQUE INDEX "AuthorizedUserMembership_one_active_level_zero_per_unit_key"
    ON "AuthorizedUserMembership"("unitId")
    WHERE "authorityLevel" = 0 AND "endedAt" IS NULL;

CREATE INDEX "AuthorizedUserMembership_userId_endedAt_idx"
    ON "AuthorizedUserMembership"("userId", "endedAt");
CREATE INDEX "AuthorizedUserMembership_unitId_endedAt_idx"
    ON "AuthorizedUserMembership"("unitId", "endedAt");

CREATE TABLE "RankDefinition" (
    "id" TEXT NOT NULL,
    "rootUnitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RankDefinition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RankDefinition_rootUnitId_fkey"
        FOREIGN KEY ("rootUnitId") REFERENCES "RootUnit"("unitId")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RankDefinition_rootUnitId_name_key"
    ON "RankDefinition"("rootUnitId", "name");
CREATE INDEX "RankDefinition_rootUnitId_sortOrder_name_idx"
    ON "RankDefinition"("rootUnitId", "sortOrder", "name");

CREATE TABLE "MedalDefinition" (
    "id" TEXT NOT NULL,
    "rootUnitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedalDefinition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MedalDefinition_rootUnitId_fkey"
        FOREIGN KEY ("rootUnitId") REFERENCES "RootUnit"("unitId")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MedalDefinition_rootUnitId_name_key"
    ON "MedalDefinition"("rootUnitId", "name");
CREATE INDEX "MedalDefinition_rootUnitId_idx"
    ON "MedalDefinition"("rootUnitId");

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