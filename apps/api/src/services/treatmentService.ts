import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/errors";
import { writeAudit } from "../utils/audit";
import { computeWithdrawal } from "./withdrawalService";
import { hasSufficientStock, isBatchExpired } from "./rules";

export type TreatmentAnimalFilters = {
  category?: "TERNERO" | "VAQUILLA" | "VACA" | "TORO" | "TORILLO";
  sex?: "MALE" | "FEMALE";
};

export type TreatmentGroupScope = "ALL_FILTERED" | "LIMIT";

export type GroupMedicationInput = {
  batchId: string;
  dose: number;
  doseUnit: string;
  route: string;
  site?: string;
  notes?: string;
};

export type GroupTreatmentCreateInput = {
  description: string;
  vetId?: string;
  startedAt: Date;
  notes?: string;
  filters: TreatmentAnimalFilters;
  scope: TreatmentGroupScope;
  limit?: number;
  medications: GroupMedicationInput[];
  tenantId: string;
  createdById?: string;
  ip?: string;
  userAgent?: string;
};

type ResolveAnimalsInput = {
  tenantId: string;
  filters: TreatmentAnimalFilters;
  scope: TreatmentGroupScope;
  limit?: number;
};

type ResolveAnimalsResult = {
  totalFiltered: number;
  selected: Array<{
    id: string;
    tag: string | null;
    internalCode: string;
  }>;
};

const applyAnimalFilters = (
  tenantId: string,
  filters: TreatmentAnimalFilters
): Prisma.AnimalWhereInput => {
  const where: Prisma.AnimalWhereInput = {
    tenantId,
    deletedAt: null,
    status: "ACTIVO",
  };

  if (filters.category) where.category = filters.category;
  if (filters.sex) where.sex = filters.sex;

  return where;
};

const resolveAnimalsWithClient = async (
  client: Prisma.TransactionClient | typeof prisma,
  input: ResolveAnimalsInput
): Promise<ResolveAnimalsResult> => {
  const animals = await client.animal.findMany({
    where: applyAnimalFilters(input.tenantId, input.filters),
    select: { id: true, tag: true, internalCode: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (animals.length === 0) {
    throw new ApiError(400, "No animals found for provided filters");
  }

  const selected =
    input.scope === "LIMIT"
      ? animals.slice(0, Math.min(input.limit ?? animals.length, animals.length))
      : animals;

  if (selected.length === 0) {
    throw new ApiError(400, "No animals selected");
  }

  return {
    totalFiltered: animals.length,
    selected,
  };
};

export const resolveGroupTreatmentAnimals = async (
  input: ResolveAnimalsInput
): Promise<ResolveAnimalsResult> => resolveAnimalsWithClient(prisma, input);

const applyAnimalLocationFilter = (
  tenantId: string,
  establishmentId?: string,
  fincaId?: string
): Prisma.AnimalWhereInput => {
  if (establishmentId) {
    return { establishmentId, tenantId };
  }
  if (fincaId) {
    return { establishment: { fincaId, tenantId } };
  }
  return { tenantId };
};

export const buildTreatmentAnimalMembershipWhere = (
  animalId: string
): Prisma.TreatmentWhereInput => ({
  OR: [{ animalId }, { animals: { some: { animalId } } }],
});

export const buildTreatmentLocationWhere = (
  tenantId: string,
  establishmentId?: string,
  fincaId?: string
): Prisma.TreatmentWhereInput => {
  if (!establishmentId && !fincaId) return {};

  const animalWhere = applyAnimalLocationFilter(tenantId, establishmentId, fincaId);
  return {
    OR: [
      { animal: animalWhere },
      { animals: { some: { tenantId, animal: animalWhere } } },
    ],
  };
};

export const createGroupTreatment = async (input: GroupTreatmentCreateInput) => {
  const now = new Date();

  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const resolved = await resolveAnimalsWithClient(tx, {
      tenantId: input.tenantId,
      filters: input.filters,
      scope: input.scope,
      limit: input.limit,
    });

    const animalsCount = resolved.selected.length;
    const batchIds = Array.from(new Set(input.medications.map((item) => item.batchId)));
    const batches = await tx.batch.findMany({
      where: { id: { in: batchIds }, tenantId: input.tenantId },
    });

    if (batches.length !== batchIds.length) {
      throw new ApiError(404, "Batch not found");
    }

    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    const requiredByBatch = new Map<string, number>();

    for (const medication of input.medications) {
      const batch = batchById.get(medication.batchId);
      if (!batch) {
        throw new ApiError(404, "Batch not found");
      }
      if (batch.deletedAt) {
        throw new ApiError(400, "Batch inactive");
      }
      if (isBatchExpired(batch.expiresAt, now)) {
        throw new ApiError(400, "Batch expired");
      }

      const quantityRequired = medication.dose * animalsCount;
      requiredByBatch.set(
        medication.batchId,
        (requiredByBatch.get(medication.batchId) ?? 0) + quantityRequired
      );
    }

    for (const [batchId, quantityRequired] of requiredByBatch.entries()) {
      const batch = batchById.get(batchId);
      if (!batch || !hasSufficientStock(batch.quantityAvailable, quantityRequired)) {
        throw new ApiError(400, "Insufficient stock");
      }
    }

    const treatment = await tx.treatment.create({
      data: {
        animalId: null,
        description: input.description,
        mode: "GROUP",
        vetId: input.vetId,
        startedAt: input.startedAt,
        status: "ACTIVE",
        notes: input.notes,
        tenantId: input.tenantId,
        createdById: input.createdById,
      },
    });

    await tx.treatmentAnimal.createMany({
      data: resolved.selected.map((animal) => ({
        treatmentId: treatment.id,
        animalId: animal.id,
        tenantId: input.tenantId,
      })),
    });

    for (const medication of input.medications) {
      const batch = batchById.get(medication.batchId);
      if (!batch) {
        throw new ApiError(404, "Batch not found");
      }

      const quantityRequired = medication.dose * animalsCount;
      const decrementResult = await tx.batch.updateMany({
        where: {
          id: batch.id,
          tenantId: input.tenantId,
          deletedAt: null,
          expiresAt: { gt: now },
          quantityAvailable: { gte: quantityRequired },
        },
        data: {
          quantityAvailable: { decrement: quantityRequired },
        },
      });

      if (decrementResult.count !== 1) {
        throw new ApiError(400, "Insufficient stock");
      }

      const withdrawal = computeWithdrawal(input.startedAt, 0, 0);

      const administration = await tx.administration.create({
        data: {
          treatmentId: treatment.id,
          batchId: batch.id,
          productId: batch.productId,
          administeredAt: input.startedAt,
          dose: medication.dose,
          doseUnit: medication.doseUnit,
          route: medication.route,
          site: medication.site,
          notes: medication.notes,
          meatWithdrawalUntil: withdrawal.meatUntil,
          milkWithdrawalUntil: withdrawal.milkUntil,
          tenantId: input.tenantId,
          createdById: input.createdById,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          batchId: batch.id,
          productId: batch.productId,
          type: "OUT",
          quantity: quantityRequired,
          unit: medication.doseUnit,
          occurredAt: input.startedAt,
          reason: "group_administration",
          refType: "ADMINISTRATION",
          refId: administration.id,
          tenantId: input.tenantId,
          createdById: input.createdById,
        },
      });
    }

    const treatmentWithRelations = await tx.treatment.findUniqueOrThrow({
      where: { id: treatment.id },
      include: {
        animal: true,
        animals: {
          include: { animal: true },
          orderBy: [{ createdAt: "asc" }, { animalId: "asc" }],
        },
        administrations: {
          include: {
            batch: true,
            product: true,
          },
          orderBy: { administeredAt: "asc" },
        },
      },
    });

    return {
      treatment: treatmentWithRelations,
      totalFiltered: resolved.totalFiltered,
      selectedAnimalsCount: resolved.selected.length,
    };
  });

  await writeAudit({
    userId: input.createdById,
    tenantId: input.tenantId,
    action: "CREATE",
    entity: "treatment",
    entityId: created.treatment.id,
    after: {
      treatmentId: created.treatment.id,
      mode: created.treatment.mode,
      filters: input.filters,
      scope: input.scope,
      totalFiltered: created.totalFiltered,
      selectedAnimalsCount: created.selectedAnimalsCount,
      medicationsCount: input.medications.length,
    },
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return created;
};
