import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticatePlatform } from "../../middleware/auth";
import { requirePlatformRoles } from "../../middleware/rbac";
import { platformAuditQuerySchema } from "../../validators/platformSchemas";

const router = Router();

router.get(
  "/",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (req, res) => {
    const data = platformAuditQuerySchema.parse(req.query);
    const where: any = {};

    if (data.tenantId) where.tenantId = data.tenantId;
    if (data.actorUserId) where.actorUserId = data.actorUserId;
    if (data.actorType) where.actorType = data.actorType;
    if (data.action) where.action = { contains: data.action, mode: "insensitive" };
    if (data.from || data.to) {
      where.occurredAt = {};
      if (data.from) where.occurredAt.gte = new Date(data.from);
      if (data.to) where.occurredAt.lte = new Date(data.to);
    }

    const skip = (data.page - 1) * data.pageSize;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip,
        take: data.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      items,
      total,
      page: data.page,
      pageSize: data.pageSize,
    });
  })
);

export default router;
