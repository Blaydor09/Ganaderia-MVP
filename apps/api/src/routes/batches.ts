import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { batchCreateSchema, batchUpdateSchema } from "../validators/batchSchemas";
import { getPagination } from "../utils/pagination";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const where: Record<string, unknown> = { deletedAt: null, organizationId };
    if (req.query.productId) where.productId = req.query.productId;

    const [items, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { expiresAt: "asc" },
        include: { product: true, supplier: true },
      }),
      prisma.batch.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const data = batchCreateSchema.parse(req.body);
    const product = await prisma.product.findFirst({
      where: { id: data.productId, organizationId, deletedAt: null },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, organizationId },
      });
      if (!supplier) {
        return res.status(400).json({ message: "Supplier not found" });
      }
    }
    const created = await prisma.batch.create({
      data: {
        productId: data.productId,
        organizationId,
        batchNumber: data.batchNumber,
        expiresAt: new Date(data.expiresAt),
        supplierId: data.supplierId,
        receivedAt: new Date(data.receivedAt),
        cost: data.cost,
        quantityInitial: data.quantityInitial,
        quantityAvailable: data.quantityAvailable,
      },
    });
    res.status(201).json(created);
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const data = batchUpdateSchema.parse(req.body);
    const existing = await prisma.batch.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }

    if (data.productId) {
      const product = await prisma.product.findFirst({
        where: { id: data.productId, organizationId, deletedAt: null },
      });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
    }

    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, organizationId },
      });
      if (!supplier) {
        return res.status(400).json({ message: "Supplier not found" });
      }
    }
    const updated = await prisma.batch.update({
      where: { id: req.params.id },
      data: {
        batchNumber: data.batchNumber,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        supplierId: data.supplierId,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
        cost: data.cost,
        quantityInitial: data.quantityInitial,
        quantityAvailable: data.quantityAvailable,
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
    const organizationId = req.user!.organizationId;
    const existing = await prisma.batch.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }
    const deleted = await prisma.batch.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json(deleted);
  })
);

export default router;
