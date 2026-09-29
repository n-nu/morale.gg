-- Permit historical command groups with no truthful participation backfill to
-- remain readable as legacy-unconfigured records. New writes require a claim
-- through the Events -> Audits service boundary.

ALTER TABLE "EventCommandGroup"
  ALTER COLUMN "eventParticipationId" DROP NOT NULL;