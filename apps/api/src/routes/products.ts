import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { productCreateSchema, productUpdateSchema } from "../validators/productSchemas";
import { getPagination } from "../utils/pagination";
import { writeAudit } from "../utils/audit";

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
    const created = await prisma.product.create({
      data: { ...data, createdById: req.user?.id },
    });

    await writeAudit({
      userId: req.user?.id,
      action: "CREATE",
      entity: "product",
      entityId: created.id,
      after: created,
      ip: req.ip,
    });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const data = productUpdateSchema.parse(req.body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });

    await writeAudit({
      userId: req.user?.id,
      action: "UPDATE",
      entity: "product",
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
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const deleted = await prisma.product.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId: req.user?.id,
      action: "DELETE",
      entity: "product",
      entityId: deleted.id,
      before: existing,
      after: deleted,
      ip: req.ip,
    });
    res.json(deleted);
  })
);

export default router;
