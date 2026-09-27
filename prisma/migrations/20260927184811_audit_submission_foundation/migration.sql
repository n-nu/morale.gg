-- CreateEnum
CREATE TYPE "AuditLifecycle" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "AuditUnitType" AS ENUM ('REGULAR', 'RIFLES', 'CAVALRY', 'ARTILLERY');

-- CreateEnum
CREATE TYPE "AuditRoleAssignmentRole" AS ENUM ('COMMANDER', 'FLAG_BEARER');

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "rootUnitId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "atomicEventUnitId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "lifecycle" "AuditLifecycle" NOT NULL DEFAULT 'DRAFT',
    "rawData" TEXT,
    "unitType" "AuditUnitType",
    "tickets" INTEGER,
    "flagCaptures" INTEGER,
    "flagLosses" INTEGER,
    "stars" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPlayerResult" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "kills" INTEGER NOT NULL,
    "deaths" INTEGER NOT NULL,
    "assists" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditPlayerResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditRoleAssignment" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" "AuditRoleAssignmentRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Audit_atomicEventUnitId_key" ON "Audit"("atomicEventUnitId");

-- CreateIndex
CREATE INDEX "Audit_createdByUserId_idx" ON "Audit"("createdByUserId");

-- CreateIndex
CREATE INDEX "Audit_lifecycle_idx" ON "Audit"("lifecycle");

-- CreateIndex
CREATE INDEX "AuditPlayerResult_auditId_idx" ON "AuditPlayerResult"("auditId");

-- CreateIndex
CREATE INDEX "AuditPlayerResult_playerId_idx" ON "AuditPlayerResult"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditPlayerResult_auditId_playerId_key" ON "AuditPlayerResult"("auditId", "playerId");

-- CreateIndex
CREATE INDEX "AuditRoleAssignment_auditId_idx" ON "AuditRoleAssignment"("auditId");

-- CreateIndex
CREATE INDEX "AuditRoleAssignment_playerId_idx" ON "AuditRoleAssignment"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditRoleAssignment_auditId_playerId_role_key" ON "AuditRoleAssignment"("auditId", "playerId", "role");

-- RenameForeignKey
ALTER TABLE "PermissionGrant" RENAME CONSTRAINT "PermissionGrant_membership_fkey" TO "PermissionGrant_authorizedUserMembershipId_fkey";

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_atomicEventUnitId_fkey" FOREIGN KEY ("atomicEventUnitId") REFERENCES "AtomicEventUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlayerResult" ADD CONSTRAINT "AuditPlayerResult_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlayerResult" ADD CONSTRAINT "AuditPlayerResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRoleAssignment" ADD CONSTRAINT "AuditRoleAssignment_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditRoleAssignment" ADD CONSTRAINT "AuditRoleAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
