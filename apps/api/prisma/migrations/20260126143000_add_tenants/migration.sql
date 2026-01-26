-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- Add tenantId columns
ALTER TABLE "UserRole" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Establishment" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Animal" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AnimalPhoto" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AnimalEvent" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Movement" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Product" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Batch" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "InventoryTransaction" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Treatment" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Administration" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "LabResult" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Alert" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Task" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "tenantId" TEXT;

-- Seed default tenant
INSERT INTO "Tenant" ("id", "name", "createdAt", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Cuenta Principal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Backfill tenantId
UPDATE "UserRole" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Establishment" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Supplier" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Animal" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "AnimalPhoto" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "AnimalEvent" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Movement" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Product" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Batch" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "InventoryTransaction" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Treatment" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Administration" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "LabResult" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Alert" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Task" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "AuditLog" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;

-- Enforce NOT NULL
ALTER TABLE "UserRole" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Establishment" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Supplier" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Animal" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AnimalPhoto" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "AnimalEvent" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Movement" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Batch" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "InventoryTransaction" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Treatment" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Administration" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "LabResult" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Alert" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old unique indexes
DROP INDEX "UserRole_userId_roleId_key";
DROP INDEX "Animal_internalCode_key";
DROP INDEX "Animal_tag_key";
DROP INDEX "Batch_productId_batchNumber_key";

-- Create new unique indexes
CREATE UNIQUE INDEX "UserRole_userId_roleId_tenantId_key" ON "UserRole"("userId", "roleId", "tenantId");
CREATE UNIQUE INDEX "Animal_tenantId_internalCode_key" ON "Animal"("tenantId", "internalCode");
CREATE UNIQUE INDEX "Animal_tenantId_tag_key" ON "Animal"("tenantId", "tag");
CREATE UNIQUE INDEX "Batch_tenantId_productId_batchNumber_key" ON "Batch"("tenantId", "productId", "batchNumber");

-- Tenant indexes
CREATE INDEX "Tenant_createdById_idx" ON "Tenant"("createdById");
CREATE INDEX "UserRole_tenantId_idx" ON "UserRole"("tenantId");
CREATE INDEX "Establishment_tenantId_idx" ON "Establishment"("tenantId");
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");
CREATE INDEX "Animal_tenantId_idx" ON "Animal"("tenantId");
CREATE INDEX "AnimalPhoto_tenantId_idx" ON "AnimalPhoto"("tenantId");
CREATE INDEX "AnimalEvent_tenantId_idx" ON "AnimalEvent"("tenantId");
CREATE INDEX "Movement_tenantId_idx" ON "Movement"("tenantId");
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX "Batch_tenantId_idx" ON "Batch"("tenantId");
CREATE INDEX "InventoryTransaction_tenantId_idx" ON "InventoryTransaction"("tenantId");
CREATE INDEX "Treatment_tenantId_idx" ON "Treatment"("tenantId");
CREATE INDEX "Administration_tenantId_idx" ON "Administration"("tenantId");
CREATE INDEX "LabResult_tenantId_idx" ON "LabResult"("tenantId");
CREATE INDEX "Alert_tenantId_idx" ON "Alert"("tenantId");
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- Foreign keys
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnimalPhoto" ADD CONSTRAINT "AnimalPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnimalEvent" ADD CONSTRAINT "AnimalEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Administration" ADD CONSTRAINT "Administration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
