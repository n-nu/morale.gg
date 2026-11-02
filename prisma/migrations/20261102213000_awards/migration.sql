ALTER TYPE "Permission" ADD VALUE 'MANAGE_AWARDS';

CREATE TYPE "AwardCategory" AS ENUM ('PLAYER', 'UNIT');

ALTER TABLE "MedalDefinition" RENAME TO "AwardDefinition";
ALTER TABLE "AwardDefinition" RENAME CONSTRAINT "MedalDefinition_pkey" TO "AwardDefinition_pkey";
ALTER TABLE "AwardDefinition" RENAME CONSTRAINT "MedalDefinition_rootUnitId_fkey" TO "AwardDefinition_rootUnitId_fkey";
ALTER TABLE "AwardDefinition"
    ADD COLUMN "category" "AwardCategory" NOT NULL DEFAULT 'PLAYER',
    ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AwardDefinition" ALTER COLUMN "category" DROP DEFAULT;

WITH ordered AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (PARTITION BY "rootUnitId" ORDER BY "name", "id") - 1 AS "sortOrder"
    FROM "AwardDefinition"
)
UPDATE "AwardDefinition" AS award
SET "sortOrder" = ordered."sortOrder"
FROM ordered
WHERE award."id" = ordered."id";

DROP INDEX "MedalDefinition_rootUnitId_name_key";
DROP INDEX "MedalDefinition_rootUnitId_idx";
CREATE UNIQUE INDEX "AwardDefinition_rootUnitId_category_name_key"
    ON "AwardDefinition"("rootUnitId", "category", "name");
CREATE INDEX "AwardDefinition_rootUnitId_category_sortOrder_name_idx"
    ON "AwardDefinition"("rootUnitId", "category", "sortOrder", "name");

CREATE TABLE "PlayerAwardGrant" (
    "awardId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    CONSTRAINT "PlayerAwardGrant_pkey" PRIMARY KEY ("awardId", "playerId"),
    CONSTRAINT "PlayerAwardGrant_awardId_fkey"
        FOREIGN KEY ("awardId") REFERENCES "AwardDefinition"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerAwardGrant_playerId_fkey"
        FOREIGN KEY ("playerId") REFERENCES "Player"("playerId")
        ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "PlayerAwardGrant_playerId_idx" ON "PlayerAwardGrant"("playerId");

CREATE TABLE "UnitAwardGrant" (
    "awardId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    CONSTRAINT "UnitAwardGrant_pkey" PRIMARY KEY ("awardId", "unitId"),
    CONSTRAINT "UnitAwardGrant_awardId_fkey"
        FOREIGN KEY ("awardId") REFERENCES "AwardDefinition"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UnitAwardGrant_unitId_fkey"
        FOREIGN KEY ("unitId") REFERENCES "Unit"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "UnitAwardGrant_unitId_idx" ON "UnitAwardGrant"("unitId");
