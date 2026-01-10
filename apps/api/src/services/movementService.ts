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
  const animal = await prisma.animal.findUnique({
    where: { id: input.animalId },
  });
  if (!animal) {
    throw new ApiError(404, "Animal not found");
  }

  const [origin, destination] = await Promise.all([
    input.originId
      ? prisma.establishment.findUnique({ where: { id: input.originId } })
      : Promise.resolve(null),
    input.destinationId
      ? prisma.establishment.findUnique({ where: { id: input.destinationId } })
      : Promise.resolve(null),
  ]);

  if (input.originId && !origin) {
    throw new ApiError(400, "Origin establishment not found");
  }

  if (input.destinationId && !destination) {
    throw new ApiError(400, "Destination establishment not found");
  }

  if (input.movementType === "SALE" || input.movementType === "SLAUGHTER") {
    const withdrawal = await getActiveWithdrawalForAnimal(input.animalId);
    if (isWithdrawalActive(withdrawal.meatUntil)) {
      throw new ApiError(400, "Animal has active meat withdrawal");
    }
  }

  const hasLocation = Boolean(animal.establishmentId);
  let nextEstablishmentId: string | null | undefined;
  let nextStatus: "VENDIDO" | "FAENADO" | undefined;

  const ensureAssignable = (est: any, label: string) => {
    if (!est) {
      throw new ApiError(400, `${label} is required`);
    }
    if (est.type === "FINCA") {
      throw new ApiError(400, `${label} must be potrero or corral`);
    }
  };

  const ensureOriginMatches = () => {
    if (hasLocation && input.originId !== animal.establishmentId) {
      throw new ApiError(400, "Origin does not match animal location");
    }
  };

  if (input.movementType === "INTERNAL") {
    ensureAssignable(origin, "Origin establishment");
    ensureAssignable(destination, "Destination establishment");

    if (!hasLocation) {
      throw new ApiError(400, "Animal has no current establishment");
    }

    if (origin.id === destination.id) {
      throw new ApiError(400, "Origin and destination must be different");
    }

    ensureOriginMatches();

    if (!origin.fincaId || !destination.fincaId || origin.fincaId !== destination.fincaId) {
      throw new ApiError(400, "Origin and destination must belong to the same finca");
    }

    nextEstablishmentId = destination.id;
  }

  if (input.movementType === "EXTERNAL") {
    if (destination) {
      throw new ApiError(400, "Destination is not allowed for external movement");
    }

    if (hasLocation) {
      ensureAssignable(origin, "Origin establishment");
      ensureOriginMatches();
    } else if (origin) {
      throw new ApiError(400, "Animal has no current establishment");
    }

    nextEstablishmentId = null;
  }

  if (input.movementType === "SALE") {
    if (destination) {
      throw new ApiError(400, "Destination is not allowed for sale");
    }

    if (hasLocation) {
      ensureAssignable(origin, "Origin establishment");
      ensureOriginMatches();
    } else if (origin) {
      throw new ApiError(400, "Animal has no current establishment");
    }

    nextEstablishmentId = null;
    nextStatus = "VENDIDO";
  }

  if (input.movementType === "SLAUGHTER") {
    if (destination) {
      throw new ApiError(400, "Destination is not allowed for slaughter");
    }

    if (hasLocation) {
      ensureAssignable(origin, "Origin establishment");
      ensureOriginMatches();
    } else if (origin) {
      throw new ApiError(400, "Animal has no current establishment");
    }

    nextEstablishmentId = null;
    nextStatus = "FAENADO";
  }

  const operations: any[] = [
    prisma.movement.create({
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
    }),
  ];

  if (nextEstablishmentId !== undefined || nextStatus) {
    operations.push(
      prisma.animal.update({
        where: { id: animal.id },
        data: {
          establishmentId:
            nextEstablishmentId !== undefined ? nextEstablishmentId : undefined,
          status: nextStatus,
        },
      })
    );
  }

  const [movement] = await prisma.$transaction(operations);

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
