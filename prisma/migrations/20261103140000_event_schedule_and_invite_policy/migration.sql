CREATE TYPE "EventInvitePolicy" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "Event"
  ADD COLUMN "rallyMinutesBeforeStart" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "attackerName" TEXT,
  ADD COLUMN "defenderName" TEXT,
  ADD COLUMN "invitePolicy" "EventInvitePolicy" NOT NULL DEFAULT 'OPEN';
