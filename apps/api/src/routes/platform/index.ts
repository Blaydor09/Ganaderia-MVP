import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticatePlatform } from "../../middleware/auth";
import { requirePlatformRoles } from "../../middleware/rbac";
import authRoutes from "./auth";
import tenantRoutes from "./tenants";
import planRoutes from "./plans";
import usageRoutes from "./usage";
import auditRoutes from "./audit";
import supportRoutes from "./support";
import userRoutes from "./users";

const router = Router();

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/plans", planRoutes);
router.use("/usage", usageRoutes);
router.use("/audit", auditRoutes);
router.use("/support", supportRoutes);
router.use("/users", userRoutes);

router.get(
  "/dashboard",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (_req, res) => {
    const [activeTenants, suspendedTenants, totalUsers, recentAudit, topAnimals] = await Promise.all([
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.tenant.count({ where: { status: "SUSPENDED" } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.auditLog.findMany({
        orderBy: { occurredAt: "desc" },
        take: 25,
      }),
      prisma.tenant.findMany({
        take: 5,
        orderBy: { animals: { _count: "desc" } },
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { animals: true, users: true } },
        },
      }),
    ]);

    res.json({
      kpis: {
        activeTenants,
        suspendedTenants,
        totalUsers,
      },
      topTenantsByAnimals: topAnimals.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        animals: tenant._count.animals,
        users: tenant._count.users,
      })),
      recentAudit,
      generatedAt: new Date().toISOString(),
    });
  })
);

export default router;
