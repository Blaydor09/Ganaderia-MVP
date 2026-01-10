import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { animalCreateSchema, animalUpdateSchema } from "../validators/animalSchemas";
import { getPagination } from "../utils/pagination";
import { generateAnimalCode } from "../utils/code";
import { writeAudit } from "../utils/audit";
import { getActiveWithdrawalForAnimal } from "../services/withdrawalService";
import { ApiError } from "../utils/errors";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ensureAssignableEstablishment = async (establishmentId?: string) => {
  if (!establishmentId) return;
  const establishment = await prisma.establishment.findUnique({
    where: { id: establishmentId },
  });
  if (!establishment) {
    throw new ApiError(400, "Establishment not found");
  }
  if (establishment.type === "FINCA") {
    throw new ApiError(400, "Establishment must be potrero or corral");
  }
};

router.get(
  "/summary",
  authenticate,
  asyncHandler(async (req, res) => {
    const where: Prisma.AnimalWhereInput = { deletedAt: null };
    if (req.query.establishmentId) {
      where.establishmentId = String(req.query.establishmentId);
    }
    if (req.query.fincaId) {
      where.establishment = { fincaId: String(req.query.fincaId) };
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
    const where: Record<string, unknown> = { deletedAt: null };
    if (req.query.tag) where.tag = { contains: req.query.tag, mode: "insensitive" };
    if (req.query.category) where.category = req.query.category;
    if (req.query.status) where.status = req.query.status;
    if (req.query.establishmentId) where.establishmentId = req.query.establishmentId;
    if (req.query.fincaId) {
      where.establishment = { fincaId: req.query.fincaId };
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
    await ensureAssignableEstablishment(data.establishmentId);
    const animal = await prisma.animal.create({
      data: {
        internalCode: generateAnimalCode(),
        tag: data.tag,
        sex: data.sex,
        breed: data.breed,
        birthDate: new Date(data.birthDate),
        birthEstimated: data.birthEstimated ?? false,
        category: data.category,
        status: data.status ?? "ACTIVO",
        origin: data.origin,
        supplierId: data.supplierId,
        motherId: data.motherId,
        fatherId: data.fatherId,
        establishmentId: data.establishmentId,
        notes: data.notes,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      action: "CREATE",
      entity: "animal",
      entityId: animal.id,
      after: animal,
      ip: req.ip,
    });

    res.status(201).json(animal);
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const animal = await prisma.animal.findUnique({
      where: { id: req.params.id },
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
    const animal = await prisma.animal.findUnique({
      where: { id: req.params.id },
    });

    if (!animal) {
      return res.status(404).json({ message: "Animal not found" });
    }

    const lastWeight = await prisma.animalEvent.findFirst({
      where: { animalId: animal.id, type: "PESO" },
      orderBy: { occurredAt: "desc" },
    });

    const withdrawal = await getActiveWithdrawalForAnimal(animal.id);

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
    const existing = await prisma.animal.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Animal not found" });
    }

    if (data.establishmentId !== undefined) {
      await ensureAssignableEstablishment(data.establishmentId);
    }

    const updated = await prisma.animal.update({
      where: { id: req.params.id },
      data: {
        tag: data.tag,
        sex: data.sex,
        breed: data.breed,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        birthEstimated: data.birthEstimated,
        category: data.category,
        status: data.status,
        origin: data.origin,
        supplierId: data.supplierId,
        motherId: data.motherId,
        fatherId: data.fatherId,
        establishmentId: data.establishmentId,
        notes: data.notes,
      },
    });

    await writeAudit({
      userId: req.user?.id,
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
    const existing = await prisma.animal.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Animal not found" });
    }

    const deleted = await prisma.animal.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId: req.user?.id,
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
        where: { id: { in: establishmentIds } },
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
      const animal = await prisma.animal.create({
        data: {
          internalCode: generateAnimalCode(),
          tag: row.tag,
          sex: row.sex as "MALE" | "FEMALE",
          breed: row.breed,
          birthDate: new Date(row.birth_date),
          birthEstimated: row.birth_estimated === "true",
          category: row.category as any,
          status: (row.status as any) ?? "ACTIVO",
          origin: row.origin as any,
          establishmentId: row.establishment_id || undefined,
        },
      });
      created.push(animal.id);
    }

    res.json({ count: created.length });
  })
);

export default router;
