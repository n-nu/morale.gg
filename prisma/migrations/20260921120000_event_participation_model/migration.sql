CREATE TYPE "EventParticipationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DENIED');

CREATE TABLE "EventParticipation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "EventParticipationStatus" NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventParticipation_eventId_unitId_key"
    ON "EventParticipation" ("eventId", "unitId");

CREATE INDEX "EventParticipation_eventId_idx"
    ON "EventParticipation" ("eventId");

CREATE INDEX "EventParticipation_unitId_idx"
    ON "EventParticipation" ("unitId");

CREATE INDEX "EventParticipation_status_idx"
    ON "EventParticipation" ("status");

ALTER TABLE "EventParticipation"
    ADD CONSTRAINT "EventParticipation_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventParticipation"
    ADD CONSTRAINT "EventParticipation_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
