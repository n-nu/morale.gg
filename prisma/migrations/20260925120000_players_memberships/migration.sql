CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitMembership" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "UnitMembership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UnitMembership_valid_period" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt")
);

CREATE UNIQUE INDEX "Player_playerId_key" ON "Player"("playerId");
CREATE UNIQUE INDEX "UnitMembership_active_pair_key"
    ON "UnitMembership"("playerId", "unitId") WHERE "endedAt" IS NULL;
CREATE INDEX "UnitMembership_playerId_startedAt_idx" ON "UnitMembership"("playerId", "startedAt");
CREATE INDEX "UnitMembership_unitId_endedAt_idx" ON "UnitMembership"("unitId", "endedAt");
ALTER TABLE "UnitMembership" ADD CONSTRAINT "UnitMembership_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitMembership" ADD CONSTRAINT "UnitMembership_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
