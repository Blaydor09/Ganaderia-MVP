-- DropForeignKey
ALTER TABLE "Treatment" DROP CONSTRAINT "Treatment_animalId_fkey";

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
