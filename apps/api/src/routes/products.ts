import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { productCreateSchema, productUpdateSchema } from "../validators/productSchemas";
import { getPagination } from "../utils/pagination";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const where: Record<string, unknown> = { deletedAt: null };
    if (req.query.search) {
      where.name = { contains: req.query.search, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = productCreateSchema.parse(req.body);
    const created = await prisma.product.create({ data });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const data = productUpdateSchema.parse(req.body);
    const updated = await prisma.product.update({
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
    const deleted = await prisma.product.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json(deleted);
  })
);

export default router;
