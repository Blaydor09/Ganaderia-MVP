import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import {
  animalCreateSchema,
  animalQuickCreateSchema,
  animalUpdateSchema,
} from "../validators/animalSchemas";
import { getPagination } from "../utils/pagination";
import { generateAnimalCode } from "../utils/code";
import { writeAudit } from "../utils/audit";
import { getActiveWithdrawalForAnimal } from "../services/withdrawalService";
import { ApiError } from "../utils/errors";
import { assertTenantLimit, getCurrentUsageValue } from "../services/usageService";
import { buildTreatmentAnimalMembershipWhere } from "../services/treatmentService";
import { assertOperationalEstablishmentOrThrow } from "../utils/tenantScope";

const router = Router();

const MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 5_000;
const CSV_ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/octet-stream",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMPORT_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const originalName = file.originalname?.toLowerCase() ?? "";
    const hasCsvExtension = originalName.endsWith(".csv");
    const allowedMimeType = CSV_ALLOWED_MIME_TYPES.has(file.mimetype);

    if (!hasCsvExtension && !allowedMimeType) {
      cb(new ApiError(400, "Only CSV files are allowed"));
      return;
    }

    cb(null, true);
  },
});

const normalizeOptionalString = (value?: string | null) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const parseOptionalDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(value);
};

const lockAndAssertAnimalCapacity = async (
  tx: Prisma.TransactionClient,
  tenantId: string,
  additionalAnimals: number
) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
  const [currentAnimals, subscription] = await Promise.all([
    tx.animal.count({ where: { tenantId, deletedAt: null, status: "ACTIVO" } }),
    tx.tenantSubscription.findFirst({
      where: { tenantId, status: { in: ["ACTIVE", "TRIALING"] } },
      include: {
        plan: { include: { limits: { include: { usageMetric: true } } } },
      },
      orderBy: { startsAt: "desc" },
    }),
  ]);

  const hardLimit = subscription?.plan.limits.find(
    (row) => row.usageMetric.key === "ACTIVE_ANIMALS"
  )?.hardLimit;
  if (hardLimit !== null && hardLimit !== undefined && currentAnimals + additionalAnimals > hardLimit) {
    throw new ApiError(409, "Tenant limit exceeded", {
      code: "TENANT_LIMIT_EXCEEDED",
      metric: "ACTIVE_ANIMALS",
      hardLimit,
      currentValue: currentAnimals + additionalAnimals,
      tenantId,
    });
  }
};

const ensureAssignableEstablishment = async (tenantId: string, establishmentId?: string) => {
  if (!establishmentId) return;
  const establishment = await prisma.establishment.findFirst({
    where: { id: establishmentId, tenantId },
  });
  if (!establishment) {
    throw new ApiError(400, "Establishment not found");
  }
  assertOperationalEstablishmentOrThrow(establishment, "Establishment");
};

const ensureSupplier = async (tenantId: string, supplierId?: string | null) => {
  if (!supplierId) return;
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, tenantId },
  });
  if (!supplier) {
    throw new ApiError(400, "Supplier not found");
  }
};

const ensureParentAnimals = async (
  tenantId: string,
  motherId?: string | null,
  fatherId?: string | null
) => {
  const ids = [motherId, fatherId].filter(Boolean) as string[];
  if (!ids.length) return;
  const parents = await prisma.animal.findMany({
    where: { id: { in: ids }, tenantId },
    select: { id: true },
  });
  if (parents.length !== ids.length) {
    throw new ApiError(400, "Parent animal not found");
  }
};

router.get(
  "/summary",
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const where: Prisma.AnimalWhereInput = { deletedAt: null, tenantId };
    if (req.query.establishmentId) {
      where.establishmentId = String(req.query.establishmentId);
    }
    if (req.query.fincaId) {
      where.establishment = { fincaId: String(req.query.fincaId), tenantId };
    }

    const [total, byCategory, bySex, byStatus, byOrigin] = await Promise.all([
      prisma.animal.count({ where }),
      prisma.animal.groupBy({ by: ["category"], where, _count: { _all: true } }),
      prisma.animal.groupBy({ by: ["sex"], where, _count: { _all: true } }),
      prisma.animal.groupBy({ by: ["status"], where, _count: { _all: true } }),
      prisma.animal.groupBy({ by: ["origin"], where, _count: { _all: true } }),
    ]);

    res.json({
      total,
      byCategory: byCategory.map((row) => ({
        category: row.category,
        count: row._count._all,
      })),
      bySex: bySex.map((row) => ({ sex: row.sex, count: row._count._all })),
      byStatus: byStatus.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      byOrigin: byOrigin.map((row) => ({
        origin: row.origin,
        count: row._count._all,
      })),
    });
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Prisma.AnimalWhereInput = { deletedAt: null, tenantId };
    if (req.query.tag) {
      const search = String(req.query.tag);
      where.OR = [
        { tag: { contains: search, mode: "insensitive" } },
        { internalCode: { contains: search, mode: "insensitive" } },
      ];
    }
    if (req.query.category) where.category = String(req.query.category) as Prisma.AnimalWhereInput["category"];
    if (req.query.status) where.status = String(req.query.status) as Prisma.AnimalWhereInput["status"];
    if (req.query.establishmentId) where.establishmentId = String(req.query.establishmentId);
    if (req.query.fincaId) {
      where.establishment = { fincaId: String(req.query.fincaId), tenantId };
    }

    const [items, total] = await Promise.all([
      prisma.animal.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { establishment: { include: { parent: true } } },
      }),
      prisma.animal.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = animalCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    await ensureAssignableEstablishment(tenantId, data.establishmentId);
    await ensureSupplier(tenantId, data.supplierId);
    await ensureParentAnimals(tenantId, data.motherId, data.fatherId);

    const nextStatus = data.status ?? "ACTIVO";
    if (nextStatus === "ACTIVO") {
      const currentAnimals = await getCurrentUsageValue(tenantId, "ACTIVE_ANIMALS");
      await assertTenantLimit({
        tenantId,
        metricKey: "ACTIVE_ANIMALS",
        nextValue: currentAnimals + 1,
        auditContext: {
          actorUserId: req.user!.id,
          actorType: "tenant",
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          resource: "animal",
        },
      });
    }

    const tag = normalizeOptionalString(data.tag);
    const birthDate = parseOptionalDate(data.birthDate);
    const animal = await prisma.animal.create({
      data: {
        internalCode: generateAnimalCode(),
        tag,
        sex: data.sex,
        breed: data.breed,
        birthDate,
        birthEstimated: data.birthEstimated ?? false,
        category: data.category,
        status: data.status ?? "ACTIVO",
        origin: data.origin,
        supplierId: data.supplierId,
        motherId: data.motherId,
        fatherId: data.fatherId,
        establishmentId: data.establishmentId,
        tenantId,
        notes: data.notes,
        createdById: req.user?.id,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "CREATE",
      entity: "animal",
      entityId: animal.id,
      after: animal,
      ip: req.ip,
    });

    res.status(201).json(animal);
  })
);

router.post(
  "/quick",
  authenticate,
  requireRoles("ADMIN", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = animalQuickCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    await ensureAssignableEstablishment(tenantId, data.establishmentId);

    const registrationDate = parseOptionalDate(data.registrationDate);
    const breed = data.breed.trim();
    const notes = data.notes?.trim();

    const requestedCount = data.items.reduce((sum, item) => sum + item.count, 0);
    if (requestedCount > 0) {
      const currentAnimals = await getCurrentUsageValue(tenantId, "ACTIVE_ANIMALS");
      await assertTenantLimit({
        tenantId,
        metricKey: "ACTIVE_ANIMALS",
        nextValue: currentAnimals + requestedCount,
        auditContext: {
          actorUserId: req.user!.id,
          actorType: "tenant",
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          resource: "animal.bulk",
        },
      });
    }

    const animals: Prisma.AnimalCreateManyInput[] = [];
    for (const item of data.items) {
      for (let i = 0; i < item.count; i += 1) {
        const record: Prisma.AnimalCreateManyInput = {
          internalCode: generateAnimalCode(),
          tag: null,
          sex: item.sex,
          breed,
          category: item.category,
          status: "ACTIVO",
          origin: data.origin,
          establishmentId: data.establishmentId,
          tenantId,
          createdById: req.user?.id,
        };
        if (registrationDate) {
          record.createdAt = registrationDate;
        }
        if (notes) {
          record.notes = notes;
        }
        animals.push(record);
      }
    }

    const count = await prisma.$transaction(async (tx) => {
      await lockAndAssertAnimalCapacity(tx, tenantId, requestedCount);
      const created = await tx.animal.createMany({ data: animals });
      return created.count;
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "BULK_CREATE",
      entity: "animal",
      after: {
        count,
        items: data.items,
        origin: data.origin,
        status: "ACTIVO",
        establishmentId: data.establishmentId,
        registrationDate: data.registrationDate ?? null,
      },
      ip: req.ip,
    });

    res.status(201).json({ count });
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const animal = await prisma.animal.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        establishment: { include: { parent: true } },
        events: { orderBy: { occurredAt: "desc" } },
        movements: { orderBy: { occurredAt: "desc" } },
        photos: true,
      },
    });

    if (!animal || animal.deletedAt) {
      return res.status(404).json({ message: "Animal not found" });
    }

    const treatments = await prisma.treatment.findMany({
      where: {
        tenantId,
        ...buildTreatmentAnimalMembershipWhere(animal.id),
      },
      include: {
        animal: true,
        animals: {
          include: { animal: true },
          orderBy: [{ createdAt: "asc" }, { animalId: "asc" }],
        },
        administrations: { orderBy: { administeredAt: "desc" } },
      },
      orderBy: { startedAt: "desc" },
    });

    res.json({
      ...animal,
      treatments,
    });
  })
);

router.get(
  "/:id/summary",
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const animal = await prisma.animal.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!animal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    const lastWeight = await prisma.animalEvent.findFirst({
      where: { animalId: animal.id, type: "PESO" },
      orderBy: { occurredAt: "desc" },
    });

    const withdrawal = await getActiveWithdrawalForAnimal(animal.id, tenantId);

    res.json({
      animal,
      lastWeight,
      withdrawal,
    });
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = animalUpdateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const existing = await prisma.animal.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Animal not found" });
    }

    if (data.establishmentId !== undefined) {
      await ensureAssignableEstablishment(tenantId, data.establishmentId);
    }
    if (data.supplierId !== undefined) {
      await ensureSupplier(tenantId, data.supplierId);
    }
    if (data.motherId !== undefined || data.fatherId !== undefined) {
      await ensureParentAnimals(tenantId, data.motherId, data.fatherId);
    }

    const updateData: Prisma.AnimalUncheckedUpdateInput = {
      sex: data.sex,
      breed: data.breed,
      birthEstimated: data.birthEstimated,
      category: data.category,
      status: data.status,
      origin: data.origin,
      supplierId: data.supplierId,
      motherId: data.motherId,
      fatherId: data.fatherId,
      establishmentId: data.establishmentId,
      notes: data.notes,
    };

    if (data.tag !== undefined) {
      updateData.tag = normalizeOptionalString(data.tag);
    }

    if (data.birthDate !== undefined) {
      updateData.birthDate = parseOptionalDate(data.birthDate);
    }

    const updated = await prisma.animal.update({
      where: { id: req.params.id, tenantId },
      data: updateData,
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "UPDATE",
      entity: "animal",
      entityId: updated.id,
      before: existing,
      after: updated,
      ip: req.ip,
    });

    res.json(updated);
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const existing = await prisma.animal.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Animal not found" });
    }

    const deleted = await prisma.animal.update({
      where: { id: req.params.id, tenantId },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "DELETE",
      entity: "animal",
      entityId: deleted.id,
      before: existing,
      after: deleted,
      ip: req.ip,
    });

    res.json({ success: true });
  })
);

router.post(
  "/import",
  authenticate,
  requireRoles("ADMIN", "OPERADOR"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Missing file" });
    }

    if (req.file.buffer.includes(0)) {
      throw new ApiError(400, "CSV contains invalid binary content");
    }

    const tenantId = req.user!.tenantId;
    const rows = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      max_record_size: 10_000,
    }) as Record<string, string>[];

    if (rows.length > MAX_IMPORT_ROWS) {
      throw new ApiError(400, `CSV exceeds ${MAX_IMPORT_ROWS} rows`);
    }

    const incomingActiveCount = rows.reduce((count, row) => {
      const rowStatus = (row.status as string | undefined) ?? "ACTIVO";
      return rowStatus === "ACTIVO" ? count + 1 : count;
    }, 0);
    if (incomingActiveCount > 0) {
      const currentAnimals = await getCurrentUsageValue(tenantId, "ACTIVE_ANIMALS");
      await assertTenantLimit({
        tenantId,
        metricKey: "ACTIVE_ANIMALS",
        nextValue: currentAnimals + incomingActiveCount,
        auditContext: {
          actorUserId: req.user!.id,
          actorType: "tenant",
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          resource: "animal.import",
        },
      });
    }

    const establishmentIds = Array.from(
      new Set(rows.map((row) => row.establishment_id).filter(Boolean))
    ) as string[];

    if (establishmentIds.length) {
      const establishments = await prisma.establishment.findMany({
        where: { id: { in: establishmentIds }, tenantId },
      });
      if (establishments.length !== establishmentIds.length) {
        throw new ApiError(400, "Invalid establishment_id in CSV");
      }
      const invalid = establishments.find((est) => est.type !== "POTRERO");
      if (invalid) {
        throw new ApiError(400, "Establishment must be potrero");
      }
    }

    const animals = rows.map((row, index): Prisma.AnimalCreateManyInput => {
      const parsed = animalCreateSchema.safeParse({
        tag: normalizeOptionalString(row.tag) ?? undefined,
        sex: row.sex,
        breed: row.breed,
        birthDate: row.birth_date || undefined,
        birthEstimated: row.birth_estimated ? row.birth_estimated === "true" : undefined,
        category: row.category,
        status: row.status || "ACTIVO",
        origin: row.origin,
        establishmentId: row.establishment_id || undefined,
      });
      if (!parsed.success) {
        throw new ApiError(400, `Invalid CSV row ${index + 2}`, parsed.error.flatten());
      }
      return {
        internalCode: generateAnimalCode(),
        tag: parsed.data.tag,
        sex: parsed.data.sex,
        breed: parsed.data.breed.trim(),
        birthDate: parseOptionalDate(parsed.data.birthDate),
        birthEstimated: parsed.data.birthEstimated,
        category: parsed.data.category,
        status: parsed.data.status ?? "ACTIVO",
        origin: parsed.data.origin,
        establishmentId: parsed.data.establishmentId,
        tenantId,
        createdById: req.user?.id,
      };
    });

    const createdCount = await prisma.$transaction(async (tx) => {
      await lockAndAssertAnimalCapacity(tx, tenantId, incomingActiveCount);
      const created = await tx.animal.createMany({ data: animals });
      return created.count;
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "IMPORT",
      entity: "animal",
      after: { count: createdCount },
      ip: req.ip,
    });

    res.json({ count: createdCount });
  })
);

export default router;
