import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticatePlatform } from "../../middleware/auth";
import { requirePlatformRoles } from "../../middleware/rbac";
import { getTenantUsageSummary } from "../../services/usageService";

const router = Router();

router.get(
  "/",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (req, res) => {
    const tenantId = typeof req.query.tenantId === "string" ? req.query.tenantId : undefined;
    if (tenantId) {
      const summary = await getTenantUsageSummary(tenantId);
      return res.json(summary);
    }

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const summaries = await Promise.all(
      tenants.map(async (tenant) => ({
        tenant,
        usage: await getTenantUsageSummary(tenant.id),
      }))
    );

    res.json({ items: summaries, total: summaries.length });
  })
);

export default router;
