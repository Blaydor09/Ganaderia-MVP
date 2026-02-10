import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import {
  treatmentCloseSchema,
  treatmentCreateSchema,
  treatmentGroupCreateSchema,
  treatmentGroupPreviewSchema,
} from "../validators/treatmentSchemas";
import { getPagination } from "../utils/pagination";
import { writeAudit } from "../utils/audit";
import {
  buildTreatmentAnimalMembershipWhere,
  createGroupTreatment,
  resolveGroupTreatmentAnimals,
} from "../services/treatmentService";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Record<string, unknown> = { tenantId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.mode) where.mode = req.query.mode;

    const [items, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startedAt: "desc" },
        include: {
          animal: true,
          animals: {
            include: { animal: true },
            orderBy: [{ createdAt: "asc" }, { animalId: "asc" }],
          },
        },
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
      where: { id: data.animalId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!animal) {
      return res.status(400).json({ message: "Animal not found" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const treatment = await tx.treatment.create({
        data: {
          animalId: data.animalId,
          description: data.description,
          mode: "INDIVIDUAL",
          vetId: data.vetId,
          startedAt: new Date(data.startedAt),
          status: "ACTIVE",
          notes: data.notes,
          tenantId,
          createdById: req.user?.id,
        },
      });

      await tx.treatmentAnimal.create({
        data: {
          treatmentId: treatment.id,
          animalId: data.animalId,
          tenantId,
        },
      });

      return tx.treatment.findUniqueOrThrow({
        where: { id: treatment.id },
        include: {
          animal: true,
          animals: {
            include: { animal: true },
            orderBy: [{ createdAt: "asc" }, { animalId: "asc" }],
          },
        },
      });
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
  "/group/preview",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = treatmentGroupPreviewSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    let resolved: Awaited<ReturnType<typeof resolveGroupTreatmentAnimals>>;
    try {
      resolved = await resolveGroupTreatmentAnimals({
        tenantId,
        filters: data.filters,
        scope: data.scope,
        limit: data.limit,
      });
    } catch (error: any) {
      if (error?.message === "No animals found for provided filters") {
        return res.json({
          totalFiltered: 0,
          selectedCount: 0,
          preview: [],
        });
      }
      throw error;
    }

    res.json({
      totalFiltered: resolved.totalFiltered,
      selectedCount: resolved.selected.length,
      preview: resolved.selected.slice(0, 20),
    });
  })
);

router.post(
  "/group",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = treatmentGroupCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    const created = await createGroupTreatment({
      description: data.description.trim(),
      vetId: data.vetId,
      startedAt: new Date(data.startedAt),
      notes: data.notes?.trim() || undefined,
      filters: data.filters,
      scope: data.scope,
      limit: data.limit,
      medications: data.medications.map((medication) => ({
        batchId: medication.batchId,
        dose: medication.dose,
        doseUnit: medication.doseUnit.trim(),
        route: medication.route.trim(),
        administeredAt: new Date(medication.administeredAt),
        site: medication.site?.trim() || undefined,
        notes: medication.notes?.trim() || undefined,
      })),
      tenantId,
      createdById: req.user?.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      ...created.treatment,
      totalFiltered: created.totalFiltered,
      selectedAnimalsCount: created.selectedAnimalsCount,
    });
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
      where: {
        tenantId,
        ...buildTreatmentAnimalMembershipWhere(req.params.animalId),
      },
      include: {
        animal: true,
        animals: {
          include: { animal: true },
          orderBy: [{ createdAt: "asc" }, { animalId: "asc" }],
        },
        administrations: true,
      },
      orderBy: { startedAt: "desc" },
    });
    res.json(items);
  })
);

export default router;
