-- CreateEnum
CREATE TYPE "EstablishmentType" AS ENUM ('FINCA', 'POTRERO', 'CORRAL');

-- AlterTable
ALTER TABLE "Establishment" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Establishment" ADD COLUMN "fincaId" TEXT;

ALTER TABLE "Establishment" ALTER COLUMN "type" TYPE "EstablishmentType"
USING (CASE
  WHEN lower("type") = 'finca' THEN 'FINCA'
  WHEN lower("type") = 'potrero' THEN 'POTRERO'
  WHEN lower("type") = 'corral' THEN 'CORRAL'
  ELSE 'FINCA'
END)::"EstablishmentType";

UPDATE "Establishment" SET "fincaId" = "id" WHERE "type" = 'FINCA';

-- CreateIndex
CREATE INDEX "Establishment_parentId_idx" ON "Establishment"("parentId");
CREATE INDEX "Establishment_fincaId_idx" ON "Establishment"("fincaId");
CREATE INDEX "Movement_originId_idx" ON "Movement"("originId");
CREATE INDEX "Movement_destinationId_idx" ON "Movement"("destinationId");

-- AddForeignKey
ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
