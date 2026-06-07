import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/errors";
import { computeWithdrawal } from "./withdrawalService";
import { hasSufficientStock } from "./rules";
import { writeAudit } from "../utils/audit";

export type CreateAdministrationInput = {
  treatmentId: string;
  productId: string;
  administeredAt: Date;
  dose: number;
  doseUnit: string;
  route: string;
  site?: string;
  notes?: string;
  tenantId: string;
  createdById?: string;
  ip?: string;
};

export const createAdministration = async (input: CreateAdministrationInput) => {
  const product = await prisma.product.findFirst({
    where: { id: input.productId, tenantId: input.tenantId, deletedAt: null },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const treatment = await prisma.treatment.findFirst({
    where: { id: input.treatmentId, tenantId: input.tenantId },
  });

  if (!treatment) {
    throw new ApiError(404, "Treatment not found");
  }

  const linkedAnimalsCount = await prisma.treatmentAnimal.count({
    where: { treatmentId: treatment.id, tenantId: input.tenantId },
  });
  const affectedAnimalsCount =
    linkedAnimalsCount > 0 ? linkedAnimalsCount : treatment.animalId ? 1 : 0;

  if (affectedAnimalsCount <= 0) {
    throw new ApiError(400, "Treatment has no animals assigned");
  }

  const requiredQuantity = input.dose * affectedAnimalsCount;
  if (!hasSufficientStock(product.stockAvailable, requiredQuantity)) {
    throw new ApiError(400, "Insufficient stock");
  }

  const withdrawal = computeWithdrawal(
    input.administeredAt,
    0,
    0
  );

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const administration = await tx.administration.create({
      data: {
        treatmentId: input.treatmentId,
        batchId: null,
        productId: product.id,
        administeredAt: input.administeredAt,
        dose: input.dose,
        doseUnit: input.doseUnit,
        route: input.route,
        site: input.site,
        notes: input.notes,
        meatWithdrawalUntil: withdrawal.meatUntil,
        milkWithdrawalUntil: withdrawal.milkUntil,
        tenantId: input.tenantId,
        createdById: input.createdById,
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { stockAvailable: { decrement: requiredQuantity } },
    });

    return administration;
  });

  await writeAudit({
    userId: input.createdById,
    tenantId: input.tenantId,
    action: "CREATE",
    entity: "administration",
    entityId: result.id,
    after: result,
    ip: input.ip,
  });

  return result;
};
