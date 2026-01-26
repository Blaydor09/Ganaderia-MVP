import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { batchCreateSchema, batchUpdateSchema } from "../validators/batchSchemas";
import { getPagination } from "../utils/pagination";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Record<string, unknown> = { deletedAt: null, tenantId };
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
    const data = batchCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return res.status(400).json({ message: "Product not found" });
    }
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, tenantId },
        select: { id: true },
      });
      if (!supplier) {
        return res.status(400).json({ message: "Supplier not found" });
      }
    }
    const created = await prisma.batch.create({
      data: {
        productId: data.productId,
        batchNumber: data.batchNumber,
        expiresAt: new Date(data.expiresAt),
        supplierId: data.supplierId,
        receivedAt: new Date(data.receivedAt),
        cost: data.cost,
        quantityInitial: data.quantityInitial,
        quantityAvailable: data.quantityAvailable,
        tenantId,
        createdById: req.user?.id,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "CREATE",
      entity: "batch",
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
    const data = batchUpdateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const existing = await prisma.batch.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }
    if (data.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: data.supplierId, tenantId },
        select: { id: true },
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

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "UPDATE",
      entity: "batch",
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
    const tenantId = req.user!.tenantId;
    const existing = await prisma.batch.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const deleted = await prisma.batch.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "DELETE",
      entity: "batch",
      entityId: deleted.id,
      before: existing,
      after: deleted,
      ip: req.ip,
    });
    res.json(deleted);
  })
);

export default router;
