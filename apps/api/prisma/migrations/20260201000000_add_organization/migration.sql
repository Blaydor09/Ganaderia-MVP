-- CreateTable
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");

-- Backfill from legacy Tenant table if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tenant') THEN
    INSERT INTO "Organization" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
    SELECT "id", "name", "slug", "isActive", "createdAt", "updatedAt" FROM "Tenant"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

-- Seed default organization if none exist
INSERT INTO "Organization" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
SELECT '00000000-0000-0000-0000-000000000001', 'Demo Organization', 'demo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Organization");

-- Add organizationId columns (nullable for backfill)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Establishment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Animal" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AnimalPhoto" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AnimalEvent" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Movement" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "InventoryTransaction" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Treatment" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Administration" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "LabResult" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Map users to organization from legacy TenantUser if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TenantUser') THEN
    UPDATE "User" u
    SET "organizationId" = tu."tenantId"
    FROM (
      SELECT "userId", MIN("tenantId") AS "tenantId"
      FROM "TenantUser"
      GROUP BY "userId"
    ) tu
    WHERE u.id = tu."userId" AND u."organizationId" IS NULL;
  END IF;
END $$;

-- Copy tenantId into organizationId where legacy columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Alert' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "Alert" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "Alert" DROP COLUMN "tenantId"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Animal' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "Animal" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "Animal" DROP COLUMN "tenantId"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "AuditLog" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "AuditLog" DROP COLUMN "tenantId"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Establishment' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "Establishment" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "Establishment" DROP COLUMN "tenantId"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "Product" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "Product" DROP COLUMN "tenantId"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Supplier' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "Supplier" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "Supplier" DROP COLUMN "tenantId"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Task' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "Task" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "Task" DROP COLUMN "tenantId"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Treatment' AND column_name = 'tenantId') THEN
    EXECUTE 'UPDATE "Treatment" SET "organizationId" = COALESCE("organizationId", "tenantId") WHERE "organizationId" IS NULL';
    EXECUTE 'ALTER TABLE "Treatment" DROP COLUMN "tenantId"';
  END IF;
END $$;

-- Default any remaining nulls to demo org
UPDATE "User" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Establishment" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Supplier" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Animal" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "AnimalPhoto" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "AnimalEvent" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Movement" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Product" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Batch" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "InventoryTransaction" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Treatment" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Administration" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "LabResult" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "AuditLog" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Alert" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "Task" SET "organizationId" = (SELECT "id" FROM "Organization" ORDER BY "createdAt" LIMIT 1) WHERE "organizationId" IS NULL;

-- Enforce not null
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Establishment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Animal" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AnimalPhoto" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AnimalEvent" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Movement" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Batch" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "InventoryTransaction" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Treatment" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Administration" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "LabResult" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Alert" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "organizationId" SET NOT NULL;

-- Drop old unique indexes for Animal (legacy names)
DROP INDEX IF EXISTS "Animal_internalCode_key";
DROP INDEX IF EXISTS "Animal_tag_key";
DROP INDEX IF EXISTS "Animal_tag_idx";
DROP INDEX IF EXISTS "Animal_tenantId_internalCode_key";
DROP INDEX IF EXISTS "Animal_tenantId_tag_key";
DROP INDEX IF EXISTS "Animal_tenantId_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX IF NOT EXISTS "Establishment_organizationId_idx" ON "Establishment"("organizationId");
CREATE INDEX IF NOT EXISTS "Supplier_organizationId_idx" ON "Supplier"("organizationId");
CREATE INDEX IF NOT EXISTS "Animal_organizationId_idx" ON "Animal"("organizationId");
CREATE INDEX IF NOT EXISTS "AnimalPhoto_organizationId_idx" ON "AnimalPhoto"("organizationId");
CREATE INDEX IF NOT EXISTS "AnimalEvent_organizationId_idx" ON "AnimalEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "Movement_organizationId_idx" ON "Movement"("organizationId");
CREATE INDEX IF NOT EXISTS "Product_organizationId_idx" ON "Product"("organizationId");
CREATE INDEX IF NOT EXISTS "Batch_organizationId_idx" ON "Batch"("organizationId");
CREATE INDEX IF NOT EXISTS "InventoryTransaction_organizationId_idx" ON "InventoryTransaction"("organizationId");
CREATE INDEX IF NOT EXISTS "Treatment_organizationId_idx" ON "Treatment"("organizationId");
CREATE INDEX IF NOT EXISTS "Administration_organizationId_idx" ON "Administration"("organizationId");
CREATE INDEX IF NOT EXISTS "LabResult_organizationId_idx" ON "LabResult"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "Alert_organizationId_idx" ON "Alert"("organizationId");
CREATE INDEX IF NOT EXISTS "Task_organizationId_idx" ON "Task"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "Animal_organizationId_internalCode_key" ON "Animal"("organizationId", "internalCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Animal_organizationId_tag_key" ON "Animal"("organizationId", "tag");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Animal" ADD CONSTRAINT "Animal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AnimalPhoto" ADD CONSTRAINT "AnimalPhoto_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AnimalEvent" ADD CONSTRAINT "AnimalEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Movement" ADD CONSTRAINT "Movement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Batch" ADD CONSTRAINT "Batch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Administration" ADD CONSTRAINT "Administration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Alert" ADD CONSTRAINT "Alert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop defaults to keep inserts explicit
ALTER TABLE "User" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Establishment" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Supplier" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Animal" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "AnimalPhoto" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "AnimalEvent" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Movement" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Batch" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "InventoryTransaction" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Treatment" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Administration" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "LabResult" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Alert" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "organizationId" DROP DEFAULT;
