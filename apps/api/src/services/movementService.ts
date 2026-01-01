import { prisma } from "../config/prisma";
import { ApiError } from "../utils/errors";
import { getActiveWithdrawalForAnimal } from "./withdrawalService";
import { isWithdrawalActive } from "./rules";
import { writeAudit } from "../utils/audit";

export type CreateMovementInput = {
  animalId: string;
  occurredAt: Date;
  originId?: string;
  destinationId?: string;
  movementType: "INTERNAL" | "EXTERNAL" | "SALE" | "SLAUGHTER";
  transporter?: string;
  notes?: string;
  createdBy?: string;
  ip?: string;
};

export const createMovement = async (input: CreateMovementInput) => {
  const animal = await prisma.animal.findUnique({ where: { id: input.animalId } });
  if (!animal) {
    throw new ApiError(404, "Animal not found");
  }

  if (input.movementType === "SALE" || input.movementType === "SLAUGHTER") {
    const withdrawal = await getActiveWithdrawalForAnimal(input.animalId);
    if (isWithdrawalActive(withdrawal.meatUntil)) {
      throw new ApiError(400, "Animal has active meat withdrawal");
    }
  }

  const movement = await prisma.movement.create({
    data: {
      animalId: input.animalId,
      occurredAt: input.occurredAt,
      originId: input.originId,
      destinationId: input.destinationId,
      movementType: input.movementType,
      transporter: input.transporter,
      notes: input.notes,
      createdBy: input.createdBy,
    },
  });

  await writeAudit({
    userId: input.createdBy,
    action: "CREATE",
    entity: "movement",
    entityId: movement.id,
    after: movement,
    ip: input.ip,
  });

  return movement;
};
