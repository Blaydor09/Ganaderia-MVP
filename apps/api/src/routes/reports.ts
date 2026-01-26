import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";

const router = Router();

router.get(
  "/withdrawals-active",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const now = new Date();
    const establishmentId = (req.query.establishmentId as string | undefined) ?? undefined;
    const fincaId = (req.query.fincaId as string | undefined) ?? undefined;
    const treatmentFilter = establishmentId
      ? { animal: { establishmentId, tenantId } }
      : fincaId
        ? { animal: { establishment: { fincaId, tenantId } } }
        : undefined;
    const administrations = await prisma.administration.findMany({
      where: {
        OR: [
          { meatWithdrawalUntil: { gt: now } },
          { milkWithdrawalUntil: { gt: now } },
        ],
        tenantId,
        treatment: treatmentFilter,
      },
      include: {
        treatment: { include: { animal: true } },
        product: true,
      },
    });

    const map = new Map<string, any>();
    for (const admin of administrations) {
      const animal = admin.treatment.animal;
      if (!animal) continue;
      const existing = map.get(animal.id) ?? {
        animal,
        meatUntil: admin.meatWithdrawalUntil,
        milkUntil: admin.milkWithdrawalUntil,
        productNames: new Set<string>(),
      };

      existing.productNames.add(admin.product.name);
      if (admin.meatWithdrawalUntil > existing.meatUntil) {
        existing.meatUntil = admin.meatWithdrawalUntil;
      }
      if (admin.milkWithdrawalUntil > existing.milkUntil) {
        existing.milkUntil = admin.milkWithdrawalUntil;
      }
      map.set(animal.id, existing);
    }

    const items = Array.from(map.values()).map((row) => ({
      animal: row.animal,
      meatUntil: row.meatUntil,
      milkUntil: row.milkUntil,
      products: Array.from(row.productNames),
    }));

    res.json({ items, total: items.length });
  })
);

router.get(
  "/inventory-expiring",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const days = Number(req.query.days ?? 30);
    const now = new Date();
    const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const batches = await prisma.batch.findMany({
      where: {
        expiresAt: { lte: limit },
        deletedAt: null,
        tenantId,
      },
      include: { product: true },
      orderBy: { expiresAt: "asc" },
    });

    res.json({ items: batches, total: batches.length });
  })
);

router.get(
  "/consumption",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const transactions = await prisma.inventoryTransaction.groupBy({
      by: ["productId"],
      where: { type: "OUT", tenantId },
      _sum: { quantity: true },
    });

    type TxRow = { productId: string; _sum: { quantity: number | null } };
    const txRows = transactions as TxRow[];

    const products = await prisma.product.findMany({
      where: { id: { in: txRows.map((t: TxRow) => t.productId) }, tenantId },
    });

    const items = txRows.map((row: TxRow) => ({
      product: products.find((p: { id: string }) => p.id === row.productId),
      total: row._sum.quantity ?? 0,
    }));

    res.json({ items });
  })
);

router.get(
  "/weights",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const animalId = req.query.animalId as string | undefined;
    const where: Record<string, unknown> = { type: "PESO", tenantId };
    if (animalId) where.animalId = animalId;

    const events = await prisma.animalEvent.findMany({
      where,
      orderBy: { occurredAt: "asc" },
    });

    res.json({ items: events });
  })
);

export default router;
