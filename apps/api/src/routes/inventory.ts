import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { inventoryTxSchema } from "../validators/inventorySchemas";
import { createInventoryTransaction, getInventoryAlerts } from "../services/inventoryService";

const router = Router();

router.get(
  "/summary",
  authenticate,
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, minStock: true, unit: true },
      orderBy: { name: "asc" },
    });

    const totals = await prisma.batch.groupBy({
      by: ["productId"],
      where: { deletedAt: null },
      _sum: { quantityAvailable: true },
    });

    const totalMap = new Map<string, number>();
    for (const row of totals) {
      totalMap.set(row.productId, row._sum.quantityAvailable ?? 0);
    }

    const items = products.map((product) => ({
      product,
      total: totalMap.get(product.id) ?? 0,
    }));

    res.json({ items });
  })
);

router.get(
  "/",
  authenticate,
  asyncHandler(async (_req, res) => {
    const batches = await prisma.batch.findMany({
      where: { deletedAt: null },
      include: { product: true },
      orderBy: { expiresAt: "asc" },
    });
    res.json(batches);
  })
);

router.post(
  "/transactions",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = inventoryTxSchema.parse(req.body);
    const tx = await createInventoryTransaction({
      batchId: data.batchId,
      type: data.type,
      quantity: data.quantity,
      unit: data.unit,
      occurredAt: new Date(data.occurredAt),
      reason: data.reason,
      createdById: req.user?.id,
      ip: req.ip,
    });
    res.status(201).json(tx);
  })
);

router.get(
  "/alerts",
  authenticate,
  asyncHandler(async (_req, res) => {
    const alerts = await getInventoryAlerts();
    res.json(alerts);
  })
);

export default router;
