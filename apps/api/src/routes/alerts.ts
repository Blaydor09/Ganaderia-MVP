import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { alertCreateSchema } from "../validators/alertSchemas";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const alerts = await prisma.alert.findMany({ orderBy: { dueAt: "asc" } });
    res.json(alerts);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = alertCreateSchema.parse(req.body);
    const created = await prisma.alert.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        dueAt: new Date(data.dueAt),
        createdById: req.user?.id,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      action: "CREATE",
      entity: "alert",
      entityId: created.id,
      after: created,
      ip: req.ip,
    });
    res.status(201).json(created);
  })
);

export default router;
