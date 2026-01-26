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

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const normalizeOptionalString = (value?: string | null) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const parseOptionalDate = (value?: string | null) => {
  if (!value) return null;
  return new Date(value);
};

const ensureAssignableEstablishment = async (tenantId: string, establishmentId?: string) => {
  if (!establishmentId) return;
  const establishment = await prisma.establishment.findFirst({
    where: { id: establishmentId, tenantId },
  });
  if (!establishment) {
    throw new ApiError(400, "Establishment not found");
  }
  if (establishment.type === "FINCA") {
    throw new ApiError(400, "Establishment must be potrero or corral");
  }
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
    const where: Record<string, unknown> = { deletedAt: null, tenantId };
    if (req.query.tag) where.tag = { contains: req.query.tag, mode: "insensitive" };
    if (req.query.category) where.category = req.query.category;
    if (req.query.status) where.status = req.query.status;
    if (req.query.establishmentId) where.establishmentId = req.query.establishmentId;
    if (req.query.fincaId) {
      where.establishment = { fincaId: req.query.fincaId, tenantId };
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

    const birthDate = parseOptionalDate(data.birthDate);
    const breed = data.breed.trim();
    const notes = data.notes?.trim();
    const status = data.status ?? "ACTIVO";
    const birthEstimated = data.birthEstimated ?? false;

    const animals: Prisma.AnimalCreateManyInput[] = [];
    for (const item of data.items) {
      for (let i = 0; i < item.count; i += 1) {
        const record: Prisma.AnimalCreateManyInput = {
          internalCode: generateAnimalCode(),
          tag: null,
          sex: item.sex,
          breed,
          birthDate,
          birthEstimated,
          category: item.category,
          status,
          origin: data.origin,
          tenantId,
          createdById: req.user?.id,
        };
        if (data.establishmentId) {
          record.establishmentId = data.establishmentId;
        }
        if (notes) {
          record.notes = notes;
        }
        animals.push(record);
      }
    }

    const chunkSize = 500;
    let count = 0;
    for (let i = 0; i < animals.length; i += chunkSize) {
      const chunk = animals.slice(i, i + chunkSize);
      const created = await prisma.animal.createMany({ data: chunk });
      count += created.count;
    }

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "BULK_CREATE",
      entity: "animal",
      after: {
        count,
        items: data.items,
        origin: data.origin,
        status,
        establishmentId: data.establishmentId ?? null,
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
        treatments: { include: { administrations: true } },
        photos: true,
      },
    });

    if (!animal || animal.deletedAt) {
      return res.status(404).json({ message: "Animal not found" });
    }

    res.json(animal);
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
      where: { id: req.params.id },
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
      where: { id: req.params.id },
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

    const tenantId = req.user!.tenantId;
    const rows = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

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
      const invalid = establishments.find((est) => est.type === "FINCA");
      if (invalid) {
        throw new ApiError(400, "Establishment must be potrero or corral");
      }
    }

    const created: string[] = [];
    for (const row of rows) {
      const tag = normalizeOptionalString(row.tag);
      const birthDate = parseOptionalDate(row.birth_date);
      const animal = await prisma.animal.create({
        data: {
          internalCode: generateAnimalCode(),
          tag,
          sex: row.sex as "MALE" | "FEMALE",
          breed: row.breed.trim(),
          birthDate,
          birthEstimated: row.birth_estimated === "true",
          category: row.category as any,
          status: (row.status as any) ?? "ACTIVO",
          origin: row.origin as any,
          establishmentId: row.establishment_id || undefined,
          tenantId,
          createdById: req.user?.id,
        },
      });
      created.push(animal.id);
    }

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "IMPORT",
      entity: "animal",
      after: { count: created.length },
      ip: req.ip,
    });

    res.json({ count: created.length });
  })
);

export default router;
