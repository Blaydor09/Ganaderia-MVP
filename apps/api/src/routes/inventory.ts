import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { inventoryTxSchema } from "../validators/inventorySchemas";
import { createInventoryTransaction, getInventoryAlerts } from "../services/inventoryService";
import { getPagination } from "../utils/pagination";

const router = Router();

router.get(
  "/summary",
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const products = await prisma.product.findMany({
      where: { deletedAt: null, tenantId },
      select: { id: true, name: true, minStock: true, unit: true, stockAvailable: true },
      orderBy: { name: "asc" },
    });

    const items = products.map((product) => ({
      product,
      total: product.stockAvailable,
    }));

    res.json({ items });
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Prisma.ProductWhereInput = { deletedAt: null, tenantId };
    const now = new Date();
    const soon30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search.length > 0) {
        where.name = { contains: search, mode: "insensitive" };
      }
    }
    if (req.query.status) {
      const status = String(req.query.status).toUpperCase();
      if (status === "ACTIVE") {
        where.stockAvailable = { gt: 0 };
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gt: soon30 } }
        ];
      }
      if (status === "EXPIRING") {
        where.stockAvailable = { gt: 0 };
        where.expiresAt = { gt: now, lte: soon30 };
      }
      if (status === "EXPIRED") {
        where.expiresAt = { lte: now };
      }
      if (status === "OUT_OF_STOCK") {
        where.stockAvailable = { lte: 0 };
      }
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      items,
      total,
      page,
      pageSize,
    });
  })
);

router.get(
  "/transactions",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Prisma.InventoryTransactionWhereInput = { tenantId };

    if (req.query.search) {
      const search = String(req.query.search).trim();
      if (search.length > 0) {
        where.OR = [
          { reason: { contains: search, mode: "insensitive" } },
          {
            batch: {
              is: {
                batchNumber: { contains: search, mode: "insensitive" },
              },
            },
          },
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

    const [items, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          batch: {
            select: { id: true, batchNumber: true },
          },
          product: {
            select: { id: true, name: true, unit: true },
          },
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/transactions",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = inventoryTxSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const tx = await createInventoryTransaction({
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      unit: data.unit,
      occurredAt: new Date(data.occurredAt),
      reason: data.reason,
      tenantId,
      createdById: req.user?.id,
      ip: req.ip,
    });
    res.status(201).json(tx);
  })
);

router.get(
  "/alerts",
  authenticate,
  asyncHandler(async (req, res) => {
    const alerts = await getInventoryAlerts(req.user!.tenantId);
    res.json(alerts);
  })
);

export default router;
