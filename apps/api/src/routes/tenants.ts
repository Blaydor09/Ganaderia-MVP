import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { tenantCreateSchema } from "../validators/tenantSchemas";
import { ensureBaseRoles } from "../utils/roles";
import { ApiError } from "../utils/errors";
import { getUserTenants, switchTenant } from "../services/authService";
import { writeAudit } from "../utils/audit";
import { getTenantUsageSummary } from "../services/usageService";

const router = Router();

router.get(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const items = await getUserTenants(req.user!.id);
    res.json({ items, activeTenantId: req.user!.tenantId });
  })
);

router.get(
  "/current/plan-usage",
  authenticate,
  asyncHandler(async (req, res) => {
    const summary = await getTenantUsageSummary(req.user!.tenantId!);
    res.json(summary);
  })
);

router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = tenantCreateSchema.parse(req.body);
    await ensureBaseRoles();

    const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    if (!adminRole) {
      throw new ApiError(500, "Missing ADMIN role");
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: data.name.trim(),
        createdById: req.user!.id,
        ownerId: req.user!.id,
        status: "ACTIVE",
      },
    });

    await prisma.userRole.create({
      data: {
        userId: req.user!.id,
        roleId: adminRole.id,
        tenantId: tenant.id,
      },
    });

    const freePlan = await prisma.plan.findUnique({ where: { code: "FREE" } });
    if (freePlan) {
      await prisma.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: freePlan.id,
          status: "ACTIVE",
          createdById: req.user!.id,
        },
      });
    }

    await writeAudit({
      userId: req.user!.id,
      actorType: "tenant",
      tenantId: tenant.id,
      action: "CREATE",
      entity: "tenant",
      entityId: tenant.id,
      after: { id: tenant.id, name: tenant.name },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const session = await switchTenant({
      userId: req.user!.id,
      tenantId: tenant.id,
      previousTenantId: req.user!.tenantId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    res.status(201).json(session);
  })
);

export default router;
