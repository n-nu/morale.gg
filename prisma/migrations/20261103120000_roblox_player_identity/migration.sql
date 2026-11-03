ALTER TABLE "Player"
    ADD COLUMN "robloxUsername" TEXT,
    ADD COLUMN "robloxAvatarUrl" TEXT,
    ADD COLUMN "robloxSyncedAt" TIMESTAMP(3);

CREATE INDEX "Player_robloxSyncedAt_idx" ON "Player"("robloxSyncedAt");
