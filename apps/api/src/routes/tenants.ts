import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { tenantCreateSchema } from "../validators/tenantSchemas";
import { ensureBaseRoles } from "../utils/roles";
import { ApiError } from "../utils/errors";
import { getUserTenants, switchTenant } from "../services/authService";
import { writeAudit } from "../utils/audit";
import { getTenantUsageSummary } from "../services/usageService";
import { setTenantRefreshCookie } from "../utils/authCookies";
import { env } from "../config/env";

const router = Router();

const toPublicSession = <T extends { refreshToken: string }>(session: T) => {
  const { refreshToken, ...publicSession } = session;
  return publicSession;
};

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
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    if (env.tenantCreationMode === "closed") {
      throw new ApiError(403, "Tenant creation is disabled");
    }

    const data = tenantCreateSchema.parse(req.body);
    await ensureBaseRoles();

    const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    if (!adminRole) {
      throw new ApiError(500, "Missing ADMIN role");
    }

    const freePlan = await prisma.plan.findUnique({ where: { code: "FREE" } });
    const tenant = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user!.id}))`;
      const ownedCount = await tx.tenant.count({ where: { ownerId: req.user!.id } });
      if (ownedCount >= env.maxTenantsPerUser) {
        throw new ApiError(409, "Tenant creation quota exceeded", {
          code: "TENANT_CREATION_LIMIT_EXCEEDED",
          limit: env.maxTenantsPerUser,
        });
      }

      const created = await tx.tenant.create({
        data: {
          name: data.name.trim(),
          createdById: req.user!.id,
          ownerId: req.user!.id,
          status: "ACTIVE",
        },
      });

      await tx.userRole.create({
        data: {
          userId: req.user!.id,
          roleId: adminRole.id,
          tenantId: created.id,
        },
      });

      if (freePlan) {
        await tx.tenantSubscription.create({
          data: {
            tenantId: created.id,
            planId: freePlan.id,
            status: "ACTIVE",
            createdById: req.user!.id,
          },
        });
      }

      return created;
    });

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

    setTenantRefreshCookie(res, session.refreshToken);
    res.status(201).json(toPublicSession(session));
  })
);

export default router;
