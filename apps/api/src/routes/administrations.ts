import { Router } from "express";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import {
  administrationCreateSchema,
  administrationUpdateSchema,
} from "../validators/administrationSchemas";
import { createAdministration } from "../services/administrationService";
import { getPagination } from "../utils/pagination";
import { ApiError } from "../utils/errors";
import { computeWithdrawal } from "../services/withdrawalService";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const where: Record<string, unknown> = { organizationId };
    if (req.query.animalId) {
      where.treatment = { animalId: req.query.animalId };
    }

    const [items, total] = await Promise.all([
      prisma.administration.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { administeredAt: "desc" },
        include: { product: true, batch: true, treatment: true },
      }),
      prisma.administration.count({ where }),
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
    const data = administrationCreateSchema.parse(req.body);
    const created = await createAdministration({
      treatmentId: data.treatmentId,
      batchId: data.batchId,
      organizationId,
      administeredAt: new Date(data.administeredAt),
      dose: data.dose,
      doseUnit: data.doseUnit,
      route: data.route,
      site: data.site,
      notes: data.notes,
      createdBy: req.user?.id,
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
    const organizationId = req.user!.organizationId;
    const data = administrationUpdateSchema.parse(req.body);
    const existing = await prisma.administration.findFirst({
      where: { id: req.params.id, organizationId },
      include: { batch: { include: { product: true } } },
    });

    if (!existing) {
      throw new ApiError(404, "Administration not found");
    }

    const doseDiff = data.dose !== undefined ? data.dose - existing.dose : 0;
    if (doseDiff > 0 && existing.batch.quantityAvailable < doseDiff) {
      throw new ApiError(400, "Insufficient stock for edit");
    }

    let withdrawal = {
      meatUntil: existing.meatWithdrawalUntil,
      milkUntil: existing.milkWithdrawalUntil,
    };

    if (data.administeredAt) {
      withdrawal = computeWithdrawal(
        new Date(data.administeredAt),
        existing.batch.product.meatWithdrawalDays,
        existing.batch.product.milkWithdrawalDays
      );
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (doseDiff !== 0) {
        await tx.batch.update({
          where: { id: existing.batchId },
          data:
            doseDiff > 0
              ? { quantityAvailable: { decrement: doseDiff } }
              : { quantityAvailable: { increment: Math.abs(doseDiff) } },
        });

        await tx.inventoryTransaction.create({
          data: {
            batchId: existing.batchId,
            productId: existing.productId,
            organizationId,
            type: "ADJUST",
            quantity: Math.abs(doseDiff),
            unit: data.doseUnit ?? existing.doseUnit,
            occurredAt: new Date(),
            reason: "administration_edit",
            createdBy: req.user?.id,
          },
        });
      }

      return tx.administration.update({
        where: { id: req.params.id },
        data: {
          administeredAt: data.administeredAt
            ? new Date(data.administeredAt)
            : undefined,
          dose: data.dose,
          doseUnit: data.doseUnit,
          route: data.route,
          site: data.site,
          notes: data.notes,
          meatWithdrawalUntil: withdrawal.meatUntil,
          milkWithdrawalUntil: withdrawal.milkUntil,
        },
      });
    });

    await writeAudit({
      organizationId,
      userId: req.user?.id,
      action: "UPDATE",
      entity: "administration",
      entityId: updated.id,
      before: existing,
      after: updated,
      ip: req.ip,
    });

    res.json(updated);
  })
);

export default router;
