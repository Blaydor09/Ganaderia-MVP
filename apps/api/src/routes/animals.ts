import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { animalCreateSchema, animalUpdateSchema } from "../validators/animalSchemas";
import { getPagination } from "../utils/pagination";
import { generateAnimalCode } from "../utils/code";
import { writeAudit } from "../utils/audit";
import { getActiveWithdrawalForAnimal } from "../services/withdrawalService";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

    const [items, total] = await Promise.all([
      prisma.animal.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { establishment: true },
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
        establishment: true,
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
  requireRoles("ADMIN", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = animalUpdateSchema.parse(req.body);
    const existing = await prisma.animal.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Animal not found" });
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
