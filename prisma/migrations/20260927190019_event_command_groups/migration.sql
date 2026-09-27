-- AlterTable
ALTER TABLE "AtomicEventUnit" ADD COLUMN     "commandGroupId" TEXT;

-- CreateTable
CREATE TABLE "EventCommandGroup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "representedUnitId" TEXT NOT NULL,
    "commanderPlayerId" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCommandGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventCommandGroup_eventId_parentGroupId_idx" ON "EventCommandGroup"("eventId", "parentGroupId");

-- CreateIndex
CREATE INDEX "EventCommandGroup_representedUnitId_idx" ON "EventCommandGroup"("representedUnitId");

-- CreateIndex
CREATE INDEX "EventCommandGroup_commanderPlayerId_idx" ON "EventCommandGroup"("commanderPlayerId");

-- AddForeignKey
ALTER TABLE "AtomicEventUnit" ADD CONSTRAINT "AtomicEventUnit_commandGroupId_fkey" FOREIGN KEY ("commandGroupId") REFERENCES "EventCommandGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCommandGroup" ADD CONSTRAINT "EventCommandGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCommandGroup" ADD CONSTRAINT "EventCommandGroup_representedUnitId_fkey" FOREIGN KEY ("representedUnitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCommandGroup" ADD CONSTRAINT "EventCommandGroup_commanderPlayerId_fkey" FOREIGN KEY ("commanderPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCommandGroup" ADD CONSTRAINT "EventCommandGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "EventCommandGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
