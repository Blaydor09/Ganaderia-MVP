import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/errors";
import { computeWithdrawal } from "./withdrawalService";
import { hasSufficientStock, isBatchExpired } from "./rules";
import { writeAudit } from "../utils/audit";

export type CreateAdministrationInput = {
  treatmentId: string;
  batchId: string;
  administeredAt: Date;
  dose: number;
  doseUnit: string;
  route: string;
  site?: string;
  notes?: string;
  createdById?: string;
  ip?: string;
};

export const createAdministration = async (input: CreateAdministrationInput) => {
  const batch = await prisma.batch.findUnique({
    where: { id: input.batchId },
    include: { product: true },
  });

  if (!batch) {
    throw new ApiError(404, "Batch not found");
  }

  if (batch.deletedAt) {
    throw new ApiError(400, "Batch inactive");
  }

  if (isBatchExpired(batch.expiresAt)) {
    throw new ApiError(400, "Batch expired");
  }

  if (!hasSufficientStock(batch.quantityAvailable, input.dose)) {
    throw new ApiError(400, "Insufficient stock");
  }

  const treatment = await prisma.treatment.findUnique({
    where: { id: input.treatmentId },
  });

  if (!treatment) {
    throw new ApiError(404, "Treatment not found");
  }

  const withdrawal = computeWithdrawal(
    input.administeredAt,
    batch.product.meatWithdrawalDays,
    batch.product.milkWithdrawalDays
  );

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const administration = await tx.administration.create({
      data: {
        treatmentId: input.treatmentId,
        batchId: batch.id,
        productId: batch.productId,
        administeredAt: input.administeredAt,
        dose: input.dose,
        doseUnit: input.doseUnit,
        route: input.route,
        site: input.site,
        notes: input.notes,
        meatWithdrawalUntil: withdrawal.meatUntil,
        milkWithdrawalUntil: withdrawal.milkUntil,
        createdById: input.createdById,
      },
    });

    await tx.batch.update({
      where: { id: batch.id },
      data: { quantityAvailable: { decrement: input.dose } },
    });

    await tx.inventoryTransaction.create({
      data: {
        batchId: batch.id,
        productId: batch.productId,
        type: "OUT",
        quantity: input.dose,
        unit: input.doseUnit,
        occurredAt: input.administeredAt,
        reason: "administration",
        refType: "ADMINISTRATION",
        refId: administration.id,
        createdById: input.createdById,
      },
    });

    return administration;
  });

  await writeAudit({
    userId: input.createdById,
    action: "CREATE",
    entity: "administration",
    entityId: result.id,
    after: result,
    ip: input.ip,
  });

  return result;
};
