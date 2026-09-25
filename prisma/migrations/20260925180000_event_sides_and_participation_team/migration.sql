-- Named host side on Event (opposing side reuses "opponent"), and the side a
-- participation was approved into. TKT-20260925-000019.
ALTER TABLE "Event" ADD COLUMN "hostSide" TEXT;

ALTER TABLE "EventParticipation" ADD COLUMN "team" TEXT;
