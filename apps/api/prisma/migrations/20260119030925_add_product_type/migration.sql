-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('VITAMINAS', 'ANTIBIOTICOS', 'DESPARASITANTE', 'VACUNAS');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "type" "ProductType",
ADD COLUMN     "vaccineTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
