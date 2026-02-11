import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { productCreateSchema, productUpdateSchema } from "../validators/productSchemas";
import { getPagination } from "../utils/pagination";
import { writeAudit } from "../utils/audit";
import { assertTenantLimit, getCurrentUsageValue } from "../services/usageService";
import { withTenantScope } from "../utils/tenantScope";

const router = Router();
const normalizeProductName = (value: string) => value.trim().replace(/\s+/g, " ");

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Record<string, unknown> = withTenantScope(tenantId, { deletedAt: null });
    if (req.query.search) {
      where.name = { contains: req.query.search, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: "asc" },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN", "VETERINARIO", "OPERADOR"),
  asyncHandler(async (req, res) => {
    const data = productCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const normalizedName = normalizeProductName(data.name);
    const duplicate = await prisma.product.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({ message: "Product name already exists" });
    }
    const currentProducts = await getCurrentUsageValue(tenantId, "PRODUCTS");
    await assertTenantLimit({
      tenantId,
      metricKey: "PRODUCTS",
      nextValue: currentProducts + 1,
      auditContext: {
        actorUserId: req.user!.id,
        actorType: "tenant",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        resource: "product",
      },
    });
    const created = await prisma.product.create({
      data: {
        ...data,
        name: normalizedName,
        notes: data.notes?.trim() || undefined,
        unit: data.unit?.trim() || undefined,
        tenantId,
        createdById: req.user?.id,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "CREATE",
      entity: "product",
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
    const data = productUpdateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const normalizedName = data.name ? normalizeProductName(data.name) : undefined;
    if (normalizedName) {
      const duplicate = await prisma.product.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          id: { not: existing.id },
          name: { equals: normalizedName, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (duplicate) {
        return res.status(409).json({ message: "Product name already exists" });
      }
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        name: normalizedName,
        unit: data.unit?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "UPDATE",
      entity: "product",
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
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, tenantId, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const activeBatchesCount = await prisma.batch.count({
      where: {
        tenantId,
        productId: existing.id,
        deletedAt: null,
      },
    });

    if (activeBatchesCount > 0) {
      return res.status(409).json({
        message:
          "Product has active batches and cannot be deleted. Close or remove batches first.",
      });
    }

    const deleted = await prisma.product.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "DELETE",
      entity: "product",
      entityId: deleted.id,
      before: existing,
      after: deleted,
      ip: req.ip,
    });
    res.json(deleted);
  })
);

export default router;
