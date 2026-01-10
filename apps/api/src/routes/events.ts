import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { eventCreateSchema, eventUpdateSchema } from "../validators/eventSchemas";
import { getPagination } from "../utils/pagination";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const where: Record<string, unknown> = {};
    if (req.query.animalId) where.animalId = req.query.animalId;
    if (req.query.type) where.type = req.query.type;
    if (req.query.from || req.query.to) {
      where.occurredAt = {
        gte: req.query.from ? new Date(String(req.query.from)) : undefined,
        lte: req.query.to ? new Date(String(req.query.to)) : undefined,
      };
    }

    const [items, total] = await Promise.all([
      prisma.animalEvent.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { occurredAt: "desc" },
      }),
      prisma.animalEvent.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "OPERADOR", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const data = eventCreateSchema.parse(req.body);
    const created = await prisma.animalEvent.create({
      data: {
        animalId: data.animalId,
        type: data.type,
        occurredAt: new Date(data.occurredAt),
        establishmentId: data.establishmentId,
        valueNumber: data.valueNumber,
        valueText: data.valueText,
        notes: data.notes,
        createdBy: req.user?.id,
      },
    });

    if (data.type === "MUERTE" || data.type === "VENTA") {
      await writeAudit({
        userId: req.user?.id,
        action: "CREATE",
        entity: "animal_event",
        entityId: created.id,
        after: created,
        ip: req.ip,
      });
    }

    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const data = eventUpdateSchema.parse(req.body);
    const existing = await prisma.animalEvent.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updated = await prisma.animalEvent.update({
      where: { id: req.params.id },
      data: {
        type: data.type,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : undefined,
        establishmentId: data.establishmentId,
        valueNumber: data.valueNumber,
        valueText: data.valueText,
        notes: data.notes,
      },
    });

    res.json(updated);
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.animalEvent.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
