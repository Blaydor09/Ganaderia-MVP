import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const items = await prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    res.json(items);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const created = await prisma.supplier.create({
      data: { ...req.body, organizationId },
    });
    res.status(201).json(created);
  })
);

export default router;
