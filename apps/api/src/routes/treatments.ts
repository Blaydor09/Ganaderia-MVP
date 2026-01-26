import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { treatmentCreateSchema, treatmentCloseSchema } from "../validators/treatmentSchemas";
import { getPagination } from "../utils/pagination";
import { writeAudit } from "../utils/audit";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Record<string, unknown> = { tenantId };
    if (req.query.status) where.status = req.query.status;

    const [items, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startedAt: "desc" },
        include: { animal: true },
      }),
      prisma.treatment.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = treatmentCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const animal = await prisma.animal.findFirst({
      where: { id: data.animalId, tenantId },
      select: { id: true },
    });
    if (!animal) {
      return res.status(400).json({ message: "Animal not found" });
    }
    const created = await prisma.treatment.create({
      data: {
        animalId: data.animalId,
        diagnosis: data.diagnosis,
        vetId: data.vetId,
        startedAt: new Date(data.startedAt),
        status: "ACTIVE",
        notes: data.notes,
        tenantId,
        createdById: req.user?.id,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "CREATE",
      entity: "treatment",
      entityId: created.id,
      after: created,
      ip: req.ip,
    });

    res.status(201).json(created);
  })
);

router.post(
  "/:id/close",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO"),
  asyncHandler(async (req, res) => {
    const data = treatmentCloseSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const existing = await prisma.treatment.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Treatment not found" });
    }

    const updated = await prisma.treatment.update({
      where: { id: req.params.id },
      data: { status: "CLOSED", endedAt: new Date(data.endedAt) },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "UPDATE",
      entity: "treatment",
      entityId: updated.id,
      before: existing,
      after: updated,
      ip: req.ip,
    });

    res.json(updated);
  })
);

router.get(
  "/by-animal/:animalId",
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const items = await prisma.treatment.findMany({
      where: { animalId: req.params.animalId, tenantId },
      include: { administrations: true },
      orderBy: { startedAt: "desc" },
    });
    res.json(items);
  })
);

export default router;
