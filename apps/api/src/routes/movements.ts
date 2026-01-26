import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { movementCreateSchema } from "../validators/movementSchemas";
import { getPagination } from "../utils/pagination";
import { createMovement } from "../services/movementService";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Record<string, unknown> = { tenantId };
    if (req.query.animalId) where.animalId = req.query.animalId;

    const [items, total] = await Promise.all([
      prisma.movement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { occurredAt: "desc" },
      }),
      prisma.movement.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = movementCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const movement = await createMovement({
      animalId: data.animalId,
      tenantId,
      occurredAt: new Date(data.occurredAt),
      originId: data.originId,
      destinationId: data.destinationId,
      movementType: data.movementType,
      transporter: data.transporter,
      notes: data.notes,
      createdById: req.user?.id,
      ip: req.ip,
    });

    res.status(201).json(movement);
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const existing = await prisma.movement.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Movement not found" });
    }

    await prisma.movement.delete({ where: { id: req.params.id } });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "DELETE",
      entity: "movement",
      entityId: existing.id,
      before: existing,
      ip: req.ip,
    });
    res.json({ success: true });
  })
);

export default router;
