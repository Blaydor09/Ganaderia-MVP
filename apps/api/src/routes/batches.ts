import { Router } from "express";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { batchCreateSchema, batchUpdateSchema } from "../validators/batchSchemas";
import { getPagination } from "../utils/pagination";
import { writeAudit } from "../utils/audit";
import { assertTenantLimit, getCurrentUsageValue } from "../services/usageService";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Prisma.BatchWhereInput = { deletedAt: null, tenantId };
    const now = new Date();
    const soon30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (req.query.productId) where.productId = String(req.query.productId);
    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search.length > 0) {
        where.OR = [
          { batchNumber: { contains: search, mode: "insensitive" } },
          {
            product: {
              is: {
                name: { contains: search, mode: "insensitive" },
              },
            },
          },
        ];
      }
    }
    if (req.query.status) {
      const status = String(req.query.status).toUpperCase();
      if (status === "ACTIVE") {
        where.expiresAt = { gt: soon30 };
        where.quantityAvailable = { gt: 0 };
      }
      if (status === "EXPIRING") {
        where.expiresAt = { gt: now, lte: soon30 };
        where.quantityAvailable = { gt: 0 };
      }
      if (status === "EXPIRED") {
        where.expiresAt = { lte: now };
      }
      if (status === "OUT_OF_STOCK") {
        where.quantityAvailable = { lte: 0 };
      }
    }

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
    const currentBatches = await getCurrentUsageValue(tenantId, "ACTIVE_BATCHES");
    await assertTenantLimit({
      tenantId,
      metricKey: "ACTIVE_BATCHES",
      nextValue: currentBatches + 1,
      auditContext: {
        actorUserId: req.user!.id,
        actorType: "tenant",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        resource: "batch",
      },
    });
    const product = await prisma.product.findFirst({
      where: { id: data.productId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return res.status(400).json({ message: "Product not found" });
    }
    const created = await prisma.$transaction(async (tx) => {
      const draftBatch = await tx.batch.create({
        data: {
          productId: data.productId,
          batchNumber: `TMP-${randomUUID()}`,
          expiresAt: new Date(data.expiresAt),
          receivedAt: new Date(data.receivedAt),
          quantityInitial: data.quantityInitial,
          quantityAvailable: data.quantityAvailable,
          tenantId,
          createdById: req.user?.id,
        },
      });

      return tx.batch.update({
        where: { id: draftBatch.id },
        data: {
          batchNumber: `LOTE-${String(draftBatch.batchCode).padStart(6, "0")}`,
        },
      });
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
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }
    const updated = await prisma.batch.update({
      where: { id: req.params.id },
      data: {
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
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
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ message: "Batch not found" });
    }
    if (existing.quantityAvailable > 0) {
      return res.status(409).json({
        message: "Batch has available stock and cannot be deleted",
      });
    }

    const [administrationsCount, transactionsCount] = await Promise.all([
      prisma.administration.count({
        where: {
          batchId: existing.id,
          tenantId,
        },
      }),
      prisma.inventoryTransaction.count({
        where: {
          batchId: existing.id,
          tenantId,
        },
      }),
    ]);

    if (administrationsCount > 0 || transactionsCount > 0) {
      return res.status(409).json({
        message: "Batch has movement history and cannot be deleted",
      });
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
