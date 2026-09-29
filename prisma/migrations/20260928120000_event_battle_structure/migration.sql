-- Ticket 34: Event Battle structure and history-preserving Event results.

CREATE TYPE "BattlefieldSide" AS ENUM ('ATTACKER', 'DEFENDER');
CREATE TYPE "EventResultValue" AS ENUM ('ATTACKER_WIN', 'DEFENDER_WIN', 'DRAW');
CREATE TYPE "EventResultStatus" AS ENUM ('EFFECTIVE', 'PENDING', 'SUPERSEDED', 'REJECTED');

ALTER TABLE "Event"
  ADD COLUMN "defenderFlagRef" TEXT,
  ADD COLUMN "attackerFlagRef" TEXT;

ALTER TABLE "AtomicEventUnit"
  ADD COLUMN "name" TEXT,
  ADD COLUMN "side" "BattlefieldSide";

ALTER TABLE "EventCommandGroup"
  ADD COLUMN "eventParticipationId" TEXT,
  ADD COLUMN "side" "BattlefieldSide";

UPDATE "EventCommandGroup" AS command_group
SET "eventParticipationId" = participation."id"
FROM "EventParticipation" AS participation
WHERE participation."eventId" = command_group."eventId"
  AND participation."unitId" = command_group."representedUnitId"
  AND participation."status" = 'APPROVED'::"EventParticipationStatus";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "EventCommandGroup"
    WHERE "eventParticipationId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot backfill every EventCommandGroup to an approved same-Event EventParticipation';
  END IF;
END $$;

ALTER TABLE "EventCommandGroup"
  ALTER COLUMN "eventParticipationId" SET NOT NULL;

ALTER TABLE "EventCommandGroup"
  DROP COLUMN "representedUnitId";

ALTER TABLE "EventCommandGroup"
  ADD CONSTRAINT "EventCommandGroup_eventParticipationId_fkey"
  FOREIGN KEY ("eventParticipationId") REFERENCES "EventParticipation"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "EventCommandGroup_eventParticipationId_idx"
  ON "EventCommandGroup"("eventParticipationId");

CREATE TABLE "EventResult" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "value" "EventResultValue" NOT NULL,
  "status" "EventResultStatus" NOT NULL,
  "proposedByUserId" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "supersedesId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EventResult_reviewer_not_proposer_check"
    CHECK ("reviewedByUserId" IS NULL OR "reviewedByUserId" <> "proposedByUserId")
);

CREATE INDEX "EventResult_eventId_status_idx"
  ON "EventResult"("eventId", "status");
CREATE INDEX "EventResult_proposedByUserId_idx"
  ON "EventResult"("proposedByUserId");
CREATE INDEX "EventResult_reviewedByUserId_idx"
  ON "EventResult"("reviewedByUserId");
CREATE INDEX "EventResult_supersedesId_idx"
  ON "EventResult"("supersedesId");
CREATE UNIQUE INDEX "EventResult_one_effective_per_event_idx"
  ON "EventResult"("eventId")
  WHERE "status" = 'EFFECTIVE'::"EventResultStatus";

ALTER TABLE "EventResult"
  ADD CONSTRAINT "EventResult_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventResult"
  ADD CONSTRAINT "EventResult_proposedByUserId_fkey"
  FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventResult"
  ADD CONSTRAINT "EventResult_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventResult"
  ADD CONSTRAINT "EventResult_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "EventResult"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;