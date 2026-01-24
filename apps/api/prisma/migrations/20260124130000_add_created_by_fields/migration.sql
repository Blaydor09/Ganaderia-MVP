-- Rename existing createdBy columns to createdById
ALTER TABLE "AnimalEvent" RENAME COLUMN "createdBy" TO "createdById";
ALTER TABLE "Movement" RENAME COLUMN "createdBy" TO "createdById";
ALTER TABLE "InventoryTransaction" RENAME COLUMN "createdBy" TO "createdById";
ALTER TABLE "Treatment" RENAME COLUMN "createdBy" TO "createdById";
ALTER TABLE "Administration" RENAME COLUMN "createdBy" TO "createdById";

-- Add createdById columns for remaining tables
ALTER TABLE "Establishment" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Animal" ADD COLUMN "createdById" TEXT;
ALTER TABLE "AnimalPhoto" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Product" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Batch" ADD COLUMN "createdById" TEXT;
ALTER TABLE "LabResult" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Alert" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Task" ADD COLUMN "createdById" TEXT;

-- Foreign keys
ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnimalPhoto" ADD CONSTRAINT "AnimalPhoto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnimalEvent" ADD CONSTRAINT "AnimalEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Movement" ADD CONSTRAINT "Movement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Administration" ADD CONSTRAINT "Administration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Establishment_createdById_idx" ON "Establishment"("createdById");
CREATE INDEX "Supplier_createdById_idx" ON "Supplier"("createdById");
CREATE INDEX "Animal_createdById_idx" ON "Animal"("createdById");
CREATE INDEX "AnimalPhoto_createdById_idx" ON "AnimalPhoto"("createdById");
CREATE INDEX "AnimalEvent_createdById_idx" ON "AnimalEvent"("createdById");
CREATE INDEX "Movement_createdById_idx" ON "Movement"("createdById");
CREATE INDEX "Product_createdById_idx" ON "Product"("createdById");
CREATE INDEX "Batch_createdById_idx" ON "Batch"("createdById");
CREATE INDEX "InventoryTransaction_createdById_idx" ON "InventoryTransaction"("createdById");
CREATE INDEX "Treatment_createdById_idx" ON "Treatment"("createdById");
CREATE INDEX "Administration_createdById_idx" ON "Administration"("createdById");
CREATE INDEX "LabResult_createdById_idx" ON "LabResult"("createdById");
CREATE INDEX "Alert_createdById_idx" ON "Alert"("createdById");
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");
