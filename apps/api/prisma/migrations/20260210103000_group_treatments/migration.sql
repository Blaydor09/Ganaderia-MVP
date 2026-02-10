-- CreateEnum
CREATE TYPE "TreatmentMode" AS ENUM ('INDIVIDUAL', 'GROUP');

-- Alter treatment schema
ALTER TABLE "Treatment"
  RENAME COLUMN "diagnosis" TO "description";

ALTER TABLE "Treatment"
  ADD COLUMN "mode" "TreatmentMode" NOT NULL DEFAULT 'INDIVIDUAL';

ALTER TABLE "Treatment"
  ALTER COLUMN "animalId" DROP NOT NULL;

-- New pivot table for grouped treatments
CREATE TABLE "TreatmentAnimal" (
  "id" TEXT NOT NULL,
  "treatmentId" TEXT NOT NULL,
  "animalId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TreatmentAnimal_pkey" PRIMARY KEY ("id")
);

-- Backfill historical individual treatments into pivot
INSERT INTO "TreatmentAnimal" ("id", "treatmentId", "animalId", "tenantId", "createdAt", "updatedAt")
SELECT
  md5("id" || ':' || "animalId") AS "id",
  "id" AS "treatmentId",
  "animalId",
  "tenantId",
  COALESCE("createdAt", CURRENT_TIMESTAMP) AS "createdAt",
  COALESCE("createdAt", CURRENT_TIMESTAMP) AS "updatedAt"
FROM "Treatment"
WHERE "animalId" IS NOT NULL;

-- Indexes
CREATE INDEX "Treatment_animalId_idx" ON "Treatment"("animalId");
CREATE INDEX "Treatment_mode_idx" ON "Treatment"("mode");

CREATE UNIQUE INDEX "TreatmentAnimal_treatmentId_animalId_key" ON "TreatmentAnimal"("treatmentId", "animalId");
CREATE INDEX "TreatmentAnimal_treatmentId_idx" ON "TreatmentAnimal"("treatmentId");
CREATE INDEX "TreatmentAnimal_animalId_idx" ON "TreatmentAnimal"("animalId");
CREATE INDEX "TreatmentAnimal_tenantId_idx" ON "TreatmentAnimal"("tenantId");

-- Foreign keys
ALTER TABLE "TreatmentAnimal"
  ADD CONSTRAINT "TreatmentAnimal_treatmentId_fkey"
  FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TreatmentAnimal"
  ADD CONSTRAINT "TreatmentAnimal_animalId_fkey"
  FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TreatmentAnimal"
  ADD CONSTRAINT "TreatmentAnimal_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
