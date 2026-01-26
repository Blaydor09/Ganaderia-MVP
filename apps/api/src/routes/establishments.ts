import { randomUUID } from "crypto";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { establishmentCreateSchema, establishmentUpdateSchema } from "../validators/establishmentSchemas";
import { ApiError } from "../utils/errors";
import { writeAudit } from "../utils/audit";

const router = Router();

const parseBoolean = (value: unknown) => value === "true" || value === "1";

const getAnimalCountMap = async (tenantId: string, establishmentIds: string[]) => {
  if (establishmentIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await prisma.animal.groupBy({
    by: ["establishmentId"],
    where: {
      establishmentId: { in: establishmentIds },
      deletedAt: null,
      tenantId,
    },
    _count: { _all: true },
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.establishmentId) continue;
    map.set(row.establishmentId, row._count._all);
  }
  return map;
};

const withCounts = (items: any[], countMap: Map<string, number>) =>
  items.map((item) => ({
    ...item,
    animalCount: countMap.get(item.id) ?? 0,
  }));

const buildTree = (items: any[]) => {
  const byId = new Map<string, any>();
  const roots: any[] = [];

  for (const item of items) {
    byId.set(item.id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = byId.get(item.id);
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
};

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const tree = parseBoolean(req.query.tree);
    const includeCounts = parseBoolean(req.query.includeCounts);
    const where: Record<string, unknown> = { tenantId };

    if (tree) {
      const fincaId = req.query.fincaId as string | undefined;
      if (fincaId) {
        where.OR = [{ id: fincaId }, { fincaId }];
      }
    } else {
      if (req.query.type) where.type = req.query.type;
      if (req.query.parentId) where.parentId = req.query.parentId;
      if (req.query.fincaId) where.fincaId = req.query.fincaId;
    }

    const items = await prisma.establishment.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const countMap = includeCounts
      ? await getAnimalCountMap(tenantId, items.map((item) => item.id))
      : new Map<string, number>();

    const enriched = includeCounts ? withCounts(items, countMap) : items;

    res.json(tree ? buildTree(enriched) : enriched);
  })
);

router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const establishment = await prisma.establishment.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        children: { orderBy: { name: "asc" } },
      },
    });

    if (!establishment) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    res.json(establishment);
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = establishmentCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (data.type === "FINCA") {
      if (data.parentId) {
        throw new ApiError(400, "Finca cannot have parent");
      }
      const id = randomUUID();
      const created = await prisma.establishment.create({
        data: {
          id,
          name: data.name,
          type: data.type,
          parentId: null,
          fincaId: id,
          tenantId,
          createdById: req.user?.id,
        },
      });

      await writeAudit({
        userId: req.user?.id,
        tenantId,
        action: "CREATE",
        entity: "establishment",
        entityId: created.id,
        after: created,
        ip: req.ip,
      });
      return res.status(201).json(created);
    }

    if (!data.parentId) {
      throw new ApiError(400, "Parent finca is required");
    }

    const parent = await prisma.establishment.findFirst({
      where: { id: data.parentId, tenantId },
    });

    if (!parent) {
      throw new ApiError(404, "Parent finca not found");
    }

    if (parent.type !== "FINCA") {
      throw new ApiError(400, "Parent must be finca");
    }

    if (data.type === "CORRAL") {
      const existingCorral = await prisma.establishment.findFirst({
        where: { type: "CORRAL", fincaId: parent.id, tenantId },
      });
      if (existingCorral) {
        throw new ApiError(400, "Corral already exists for this finca");
      }
    }

    const created = await prisma.establishment.create({
      data: {
        name: data.name,
        type: data.type,
        parentId: parent.id,
        fincaId: parent.id,
        tenantId,
        createdById: req.user?.id,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "CREATE",
      entity: "establishment",
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
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = establishmentUpdateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const existing = await prisma.establishment.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    if (data.type && data.type !== existing.type) {
      throw new ApiError(400, "Changing establishment type is not supported");
    }

    let nextParentId = existing.parentId;
    let nextFincaId = existing.fincaId;

    if (existing.type === "FINCA") {
      if (data.parentId) {
        throw new ApiError(400, "Finca cannot have parent");
      }
      nextParentId = null;
      nextFincaId = existing.id;
    } else {
      const parentId = data.parentId ?? existing.parentId;
      if (!parentId) {
        throw new ApiError(400, "Parent finca is required");
      }

      const parent = await prisma.establishment.findFirst({
        where: { id: parentId, tenantId },
      });

      if (!parent) {
        throw new ApiError(404, "Parent finca not found");
      }

      if (parent.type !== "FINCA") {
        throw new ApiError(400, "Parent must be finca");
      }

      if (existing.type === "CORRAL" && parent.id !== existing.fincaId) {
        const existingCorral = await prisma.establishment.findFirst({
          where: {
            type: "CORRAL",
            fincaId: parent.id,
            tenantId,
            NOT: { id: existing.id },
          },
        });
        if (existingCorral) {
          throw new ApiError(400, "Corral already exists for this finca");
        }
      }

      nextParentId = parent.id;
      nextFincaId = parent.id;
    }

    const updated = await prisma.establishment.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        parentId: nextParentId,
        fincaId: nextFincaId,
      },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "UPDATE",
      entity: "establishment",
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
    const [childrenCount, animalsCount] = await Promise.all([
      prisma.establishment.count({ where: { parentId: req.params.id, tenantId } }),
      prisma.animal.count({
        where: { establishmentId: req.params.id, deletedAt: null, tenantId },
      }),
    ]);

    if (childrenCount > 0) {
      throw new ApiError(400, "Establishment has child locations");
    }

    if (animalsCount > 0) {
      throw new ApiError(400, "Establishment has assigned animals");
    }

    const existing = await prisma.establishment.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    await prisma.establishment.delete({ where: { id: req.params.id } });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "DELETE",
      entity: "establishment",
      entityId: existing.id,
      before: existing,
      ip: req.ip,
    });
    res.json({ success: true });
  })
);

export default router;
