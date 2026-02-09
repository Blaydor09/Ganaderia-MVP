import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticatePlatform } from "../../middleware/auth";
import { requirePlatformRoles } from "../../middleware/rbac";
import {
  platformAssignPlanSchema,
  platformTenantCreateSchema,
  platformTenantStatusSchema,
  platformTenantUpdateSchema,
} from "../../validators/platformSchemas";
import { hashPassword } from "../../utils/password";
import { normalizeEmail } from "../../utils/email";
import { ensureBaseRoles } from "../../utils/roles";
import { ApiError } from "../../utils/errors";
import { writeAudit } from "../../utils/audit";
import { getTenantUsageSummary } from "../../services/usageService";

const router = Router();

const parsePagination = (query: Record<string, unknown>) => {
  const parsedPage = Number(query.page ?? 1);
  const parsedPageSize = Number(query.pageSize ?? 20);
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const pageSize = Number.isFinite(parsedPageSize)
    ? Math.min(100, Math.max(1, Math.floor(parsedPageSize)))
    : 20;
  return { page, pageSize, skip: (page - 1) * pageSize };
};

router.get(
  "/",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = parsePagination(req.query as Record<string, unknown>);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;

    const where: any = {};
    if (status === "ACTIVE" || status === "SUSPENDED") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          subscriptions: {
            where: { status: { in: ["ACTIVE", "TRIALING"] } },
            include: { plan: true },
            orderBy: { startsAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              users: true,
              animals: true,
              products: true,
              batches: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      items: items.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        ownerId: tenant.ownerId,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        suspendedAt: tenant.suspendedAt,
        lastLoginAt: tenant.lastLoginAt,
        plan: tenant.subscriptions[0]
          ? {
              code: tenant.subscriptions[0].plan.code,
              name: tenant.subscriptions[0].plan.name,
              status: tenant.subscriptions[0].status,
            }
          : null,
        usage: {
          users: tenant._count.users,
          animals: tenant._count.animals,
          products: tenant._count.products,
          batches: tenant._count.batches,
        },
      })),
      total,
      page,
      pageSize,
    });
  })
);

router.post(
  "/",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformTenantCreateSchema.parse(req.body);
    await ensureBaseRoles();

    const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
    if (!adminRole) {
      throw new ApiError(500, "Missing ADMIN role");
    }

    const plan = await prisma.plan.findUnique({ where: { code: data.planCode } });
    if (!plan) {
      throw new ApiError(400, "Invalid plan");
    }

    const ownerEmail = normalizeEmail(data.ownerEmail);
    const existingOwner = await prisma.user.findFirst({
      where: { email: { equals: ownerEmail, mode: "insensitive" } },
    });
    if (existingOwner) {
      throw new ApiError(409, "Owner email already exists");
    }

    const passwordHash = await hashPassword(data.ownerPassword);
    const result = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          name: data.ownerName.trim(),
          email: ownerEmail,
          passwordHash,
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: data.name.trim(),
          slug: data.slug,
          ownerId: owner.id,
          createdById: req.user!.id,
          status: "ACTIVE",
        },
      });

      await tx.userRole.create({
        data: {
          userId: owner.id,
          roleId: adminRole.id,
          tenantId: tenant.id,
        },
      });

      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: "ACTIVE",
          createdById: req.user!.id,
        },
      });

      return { tenant, owner };
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      action: "CREATE",
      entity: "tenant",
      entityId: result.tenant.id,
      resource: "platform.tenant",
      resourceId: result.tenant.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata: {
        ownerUserId: result.owner.id,
        planCode: data.planCode,
      },
    });

    res.status(201).json({
      tenant: result.tenant,
      owner: {
        id: result.owner.id,
        name: result.owner.name,
        email: result.owner.email,
      },
    });
  })
);

router.get(
  "/:id",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true, isActive: true } },
        subscriptions: {
          orderBy: { startsAt: "desc" },
          include: { plan: true },
          take: 5,
        },
      },
    });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const usage = await getTenantUsageSummary(tenant.id);
    const recentActivity = await prisma.auditLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { occurredAt: "desc" },
      take: 20,
    });

    res.json({
      tenant,
      usage,
      recentActivity,
    });
  })
);

router.patch(
  "/:id",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformTenantUpdateSchema.parse(req.body);
    const existing = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const updated = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        name: data.name?.trim(),
        slug: data.slug,
        ownerId: data.ownerId,
      },
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      action: "UPDATE",
      entity: "tenant",
      entityId: updated.id,
      resource: "platform.tenant",
      resourceId: updated.id,
      before: existing,
      after: updated,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json(updated);
  })
);

router.post(
  "/:id/suspend",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformTenantStatusSchema.parse(req.body ?? {});
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: "SUSPENDED",
        suspendedAt: new Date(),
        suspensionReason: data.reason?.trim() ?? null,
      },
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      action: "SUSPEND",
      entity: "tenant",
      entityId: updated.id,
      resource: "platform.tenant",
      resourceId: updated.id,
      metadata: { reason: data.reason ?? null },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json(updated);
  })
);

router.post(
  "/:id/reactivate",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: "ACTIVE",
        reactivatedAt: new Date(),
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      action: "REACTIVATE",
      entity: "tenant",
      entityId: updated.id,
      resource: "platform.tenant",
      resourceId: updated.id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json(updated);
  })
);

router.post(
  "/:id/plan",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformAssignPlanSchema.parse(req.body);
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const plan = await prisma.plan.findUnique({ where: { code: data.planCode } });
    if (!plan) {
      throw new ApiError(400, "Plan not found");
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.tenantSubscription.updateMany({
        where: {
          tenantId: tenant.id,
          status: { in: ["ACTIVE", "TRIALING"] },
        },
        data: {
          status: "CANCELED",
          canceledAt: now,
          endsAt: now,
        },
      });

      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: "ACTIVE",
          startsAt: now,
          createdById: req.user!.id,
        },
      });
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      action: "CHANGE_PLAN",
      entity: "tenant.subscription",
      entityId: tenant.id,
      resource: "platform.tenant.subscription",
      resourceId: tenant.id,
      metadata: { planCode: plan.code },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const usage = await getTenantUsageSummary(tenant.id);
    res.json(usage);
  })
);

export default router;
