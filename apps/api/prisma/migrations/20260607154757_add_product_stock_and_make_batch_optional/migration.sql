-- DropForeignKey
ALTER TABLE "Administration" DROP CONSTRAINT "Administration_batchId_fkey";

-- AlterTable
ALTER TABLE "Administration" ALTER COLUMN "batchId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "stockAvailable" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Administration" ADD CONSTRAINT "Administration_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
