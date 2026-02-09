import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticatePlatform } from "../../middleware/auth";
import { requirePlatformRoles } from "../../middleware/rbac";
import {
  platformImpersonationStartSchema,
  platformImpersonationStopSchema,
  platformResetAccessSchema,
} from "../../validators/platformSchemas";
import { hashPassword } from "../../utils/password";
import { ApiError } from "../../utils/errors";
import { writeAudit } from "../../utils/audit";
import { createScopedSession } from "../../services/authService";

const router = Router();

router.post(
  "/reset-access",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (req, res) => {
    const data = platformResetAccessSchema.parse(req.body);

    const member = await prisma.userRole.findFirst({
      where: { userId: data.userId, tenantId: data.tenantId },
    });
    if (!member) {
      throw new ApiError(404, "User not found in tenant");
    }

    const passwordHash = await hashPassword(data.temporaryPassword);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: { passwordHash, isActive: true },
      });

      await tx.refreshToken.updateMany({
        where: {
          userId: data.userId,
          scope: "tenant",
          tenantId: data.tenantId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      tenantId: data.tenantId,
      action: "RESET_ACCESS",
      entity: "user",
      entityId: data.userId,
      resource: "platform.support.reset-access",
      resourceId: data.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true });
  })
);

router.post(
  "/impersonations",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformImpersonationStartSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }
    if (tenant.status !== "ACTIVE") {
      throw new ApiError(403, "Tenant suspended", { code: "TENANT_SUSPENDED" });
    }

    let targetUserId = data.targetUserId;
    if (!targetUserId) {
      const fallback = await prisma.userRole.findFirst({
        where: { tenantId: data.tenantId, role: { name: "ADMIN" }, user: { isActive: true } },
        orderBy: { assignedAt: "asc" },
      });
      targetUserId = fallback?.userId;
    }
    if (!targetUserId) {
      throw new ApiError(400, "No active admin available to impersonate");
    }

    const membership = await prisma.userRole.findMany({
      where: { userId: targetUserId, tenantId: data.tenantId },
      include: { role: true, user: true },
    });
    if (!membership.length) {
      throw new ApiError(404, "Target user is not member of tenant");
    }
    if (!membership[0].user.isActive) {
      throw new ApiError(400, "Target user is inactive");
    }

    const expiresAt = new Date(Date.now() + data.expiresInMinutes * 60 * 1000);
    const session = await prisma.impersonationSession.create({
      data: {
        platformUserId: req.user!.id,
        tenantId: data.tenantId,
        targetUserId,
        reason: data.reason,
        expiresAt,
      },
    });

    const roles = Array.from(new Set(membership.map((row) => row.role.name)));
    const tokens = await createScopedSession({
      user: {
        id: membership[0].user.id,
        name: membership[0].user.name,
        email: membership[0].user.email,
      },
      roles,
      scope: "tenant",
      tenantId: data.tenantId,
      impersonationSessionId: session.id,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      tenantId: data.tenantId,
      action: "IMPERSONATION_START",
      entity: "impersonation_session",
      entityId: session.id,
      resource: "platform.support.impersonation",
      resourceId: session.id,
      metadata: {
        targetUserId,
        reason: data.reason,
        expiresAt: session.expiresAt,
      },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json({
      sessionId: session.id,
      expiresAt: session.expiresAt,
      tenant: { id: tenant.id, name: tenant.name },
      impersonatedUser: {
        id: membership[0].user.id,
        name: membership[0].user.name,
        email: membership[0].user.email,
        roles,
      },
      ...tokens,
    });
  })
);

router.post(
  "/impersonations/:id/revoke",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformImpersonationStopSchema.parse(req.body ?? {});
    const session = await prisma.impersonationSession.findUnique({
      where: { id: req.params.id },
    });
    if (!session) {
      return res.status(404).json({ message: "Impersonation session not found" });
    }

    if (session.revokedAt) {
      return res.json({ success: true, alreadyRevoked: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.impersonationSession.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          revokedById: req.user!.id,
        },
      });

      await tx.refreshToken.updateMany({
        where: { impersonationSessionId: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      tenantId: session.tenantId,
      action: "IMPERSONATION_REVOKE",
      entity: "impersonation_session",
      entityId: session.id,
      resource: "platform.support.impersonation",
      resourceId: session.id,
      metadata: { reason: data.reason ?? null },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true });
  })
);

export default router;
