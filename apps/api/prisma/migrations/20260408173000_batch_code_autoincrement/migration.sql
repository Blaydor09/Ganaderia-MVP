CREATE SEQUENCE "Batch_batchCode_seq";

ALTER TABLE "Batch" ADD COLUMN "batchCode" INTEGER;

ALTER TABLE "Batch" ALTER COLUMN "batchCode" SET DEFAULT nextval('"Batch_batchCode_seq"');

ALTER SEQUENCE "Batch_batchCode_seq" OWNED BY "Batch"."batchCode";

UPDATE "Batch"
SET "batchCode" = nextval('"Batch_batchCode_seq"')
WHERE "batchCode" IS NULL;

ALTER TABLE "Batch" ALTER COLUMN "batchCode" SET NOT NULL;

SELECT setval(
  '"Batch_batchCode_seq"',
  COALESCE((SELECT MAX("batchCode") FROM "Batch"), 1),
  EXISTS(SELECT 1 FROM "Batch")
);

CREATE UNIQUE INDEX "Batch_batchCode_key" ON "Batch"("batchCode");
