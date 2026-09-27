/*
  Warnings:

  - You are about to drop the column `commandGroupId` on the `AtomicEventUnit` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AtomicEventUnit" DROP CONSTRAINT "AtomicEventUnit_commandGroupId_fkey";

-- AlterTable
ALTER TABLE "AtomicEventUnit" DROP COLUMN "commandGroupId";

-- CreateTable
CREATE TABLE "EventCommandGroupAtomicUnit" (
    "groupId" TEXT NOT NULL,
    "atomicEventUnitId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCommandGroupAtomicUnit_pkey" PRIMARY KEY ("groupId","atomicEventUnitId")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCommandGroupAtomicUnit_atomicEventUnitId_key" ON "EventCommandGroupAtomicUnit"("atomicEventUnitId");

-- CreateIndex
CREATE INDEX "EventCommandGroupAtomicUnit_groupId_idx" ON "EventCommandGroupAtomicUnit"("groupId");

-- AddForeignKey
ALTER TABLE "EventCommandGroupAtomicUnit" ADD CONSTRAINT "EventCommandGroupAtomicUnit_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EventCommandGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCommandGroupAtomicUnit" ADD CONSTRAINT "EventCommandGroupAtomicUnit_atomicEventUnitId_fkey" FOREIGN KEY ("atomicEventUnitId") REFERENCES "AtomicEventUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
