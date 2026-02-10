ALTER TABLE "Product"
  DROP COLUMN "activeIngredient",
  DROP COLUMN "presentation",
  DROP COLUMN "concentration",
  DROP COLUMN "meatWithdrawalDays",
  DROP COLUMN "milkWithdrawalDays",
  DROP COLUMN "requiresPrescription",
  DROP COLUMN "typicalDose";

ALTER TABLE "Product"
  ALTER COLUMN "unit" SET DEFAULT 'dosis';
