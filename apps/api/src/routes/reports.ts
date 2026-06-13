import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { buildTreatmentLocationWhere } from "../services/treatmentService";
import {
  getDemographicsReport,
  getReproductionReport,
  getHealthReport,
  getAuditReport,
  exportToCsv,
} from "../services/reports.service";

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
    const treatmentFilter = buildTreatmentLocationWhere(tenantId, establishmentId, fincaId);
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
        treatment: {
          include: {
            animal: true,
            animals: { include: { animal: true } },
          },
        },
        product: true,
      },
    });

    const map = new Map<string, any>();
    for (const admin of administrations) {
      const treatmentAnimals = new Map<string, (typeof admin.treatment.animal)>();
      if (admin.treatment.animal) {
        treatmentAnimals.set(admin.treatment.animal.id, admin.treatment.animal);
      }
      for (const relation of admin.treatment.animals) {
        if (!relation.animal) continue;
        treatmentAnimals.set(relation.animal.id, relation.animal);
      }

      for (const animal of treatmentAnimals.values()) {
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

    const products = await prisma.product.findMany({
      where: {
        expiresAt: { lte: limit },
        deletedAt: null,
        tenantId,
      },
      orderBy: { expiresAt: "asc" },
    });

    res.json({ items: products, total: products.length });
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

// --- New Endpoints ---

router.get(
  "/demographics",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const data = await getDemographicsReport(tenantId, req.query);

    if (req.query.export === "csv") {
      const csv = exportToCsv(data.byCategory, ["category", "count"]); // simplified export for demo
      res.header("Content-Type", "text/csv");
      res.attachment("demographics.csv");
      return res.send(csv);
    }

    res.json(data);
  })
);

router.get(
  "/reproduction",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const data = await getReproductionReport(tenantId, req.query);

    if (req.query.export === "csv") {
      const csv = exportToCsv(data, ["type", "count"]);
      res.header("Content-Type", "text/csv");
      res.attachment("reproduction.csv");
      return res.send(csv);
    }

    res.json(data);
  })
);

router.get(
  "/health",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const data = await getHealthReport(tenantId, req.query);

    if (req.query.export === "csv") {
      const csv = exportToCsv(data.treatmentsByStatus, ["status", "count"]);
      res.header("Content-Type", "text/csv");
      res.attachment("health.csv");
      return res.send(csv);
    }

    res.json(data);
  })
);

router.get(
  "/audit",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const data = await getAuditReport(tenantId, req.query);

    if (req.query.export === "csv") {
      const flatData = data.map((d) => ({
        id: d.id,
        user: d.user?.name || d.actorUserId,
        action: d.action,
        entity: d.entity,
        date: d.occurredAt.toISOString(),
      }));
      const csv = exportToCsv(flatData, ["id", "user", "action", "entity", "date"]);
      res.header("Content-Type", "text/csv");
      res.attachment("audit.csv");
      return res.send(csv);
    }

    res.json({ items: data, total: data.length });
  })
);
