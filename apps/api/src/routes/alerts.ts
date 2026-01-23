import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { alertCreateSchema } from "../validators/alertSchemas";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const organizationId = _req.user!.organizationId;
    const alerts = await prisma.alert.findMany({
      where: { organizationId },
      orderBy: { dueAt: "asc" },
    });
    res.json(alerts);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const data = alertCreateSchema.parse(req.body);
    const created = await prisma.alert.create({
      data: {
        type: data.type,
        organizationId,
        title: data.title,
        message: data.message,
        dueAt: new Date(data.dueAt),
      },
    });
    res.status(201).json(created);
  })
);

export default router;
