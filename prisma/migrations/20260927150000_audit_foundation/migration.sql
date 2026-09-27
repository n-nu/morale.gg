ALTER TABLE "Player"
    ALTER COLUMN "name" DROP NOT NULL;

CREATE TABLE "AtomicEventUnit" (
    "id" TEXT NOT NULL,
    "eventParticipationId" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AtomicEventUnit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AtomicEventUnit_eventParticipationId_createdAt_idx"
    ON "AtomicEventUnit" ("eventParticipationId", "createdAt");

ALTER TABLE "AtomicEventUnit"
    ADD CONSTRAINT "AtomicEventUnit_eventParticipationId_fkey"
    FOREIGN KEY ("eventParticipationId") REFERENCES "EventParticipation"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
