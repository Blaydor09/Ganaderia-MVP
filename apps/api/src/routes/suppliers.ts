import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const items = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    res.json(items);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const created = await prisma.supplier.create({
      data: { ...req.body, createdById: req.user?.id },
    });

    await writeAudit({
      userId: req.user?.id,
      action: "CREATE",
      entity: "supplier",
      entityId: created.id,
      after: created,
      ip: req.ip,
    });
    res.status(201).json(created);
  })
);

export default router;
