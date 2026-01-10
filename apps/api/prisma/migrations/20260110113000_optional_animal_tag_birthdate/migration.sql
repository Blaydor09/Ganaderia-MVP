-- Make animal tag and birthDate optional
ALTER TABLE "Animal" ALTER COLUMN "tag" DROP NOT NULL;
ALTER TABLE "Animal" ALTER COLUMN "birthDate" DROP NOT NULL;