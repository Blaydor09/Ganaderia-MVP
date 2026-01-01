import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { establishmentCreateSchema, establishmentUpdateSchema } from "../validators/establishmentSchemas";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const items = await prisma.establishment.findMany({ orderBy: { name: "asc" } });
    res.json(items);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = establishmentCreateSchema.parse(req.body);
    const created = await prisma.establishment.create({ data });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = establishmentUpdateSchema.parse(req.body);
    const updated = await prisma.establishment.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    await prisma.establishment.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  })
);

export default router;
