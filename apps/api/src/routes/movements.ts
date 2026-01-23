import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { movementCreateSchema } from "../validators/movementSchemas";
import { getPagination } from "../utils/pagination";
import { createMovement } from "../services/movementService";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const where: Record<string, unknown> = { organizationId };
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
    const organizationId = req.user!.organizationId;
    const data = movementCreateSchema.parse(req.body);
    const movement = await createMovement({
      animalId: data.animalId,
      organizationId,
      occurredAt: new Date(data.occurredAt),
      originId: data.originId,
      destinationId: data.destinationId,
      movementType: data.movementType,
      transporter: data.transporter,
      notes: data.notes,
      createdBy: req.user?.id,
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
    const organizationId = req.user!.organizationId;
    const existing = await prisma.movement.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Movement not found" });
    }
    await prisma.movement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
