import { Router } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticatePlatform } from "../../middleware/auth";
import { requirePlatformRoles } from "../../middleware/rbac";
import { platformUserRolesSchema } from "../../validators/platformSchemas";
import { ensurePlatformRoles } from "../../utils/roles";
import { ApiError } from "../../utils/errors";
import { writeAudit } from "../../utils/audit";

const router = Router();

router.get(
  "/",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin", "platform_support"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { platformRoles: { some: {} } },
      include: {
        platformRoles: {
          include: { role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        roles: Array.from(new Set(user.platformRoles.map((row) => row.role.name))),
      }))
    );
  })
);

router.post(
  "/:id/roles",
  authenticatePlatform,
  requirePlatformRoles("platform_super_admin"),
  asyncHandler(async (req, res) => {
    const data = platformUserRolesSchema.parse(req.body);
    await ensurePlatformRoles();

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const roles = await prisma.platformRole.findMany({
      where: { name: { in: data.roles } },
    });
    if (roles.length !== data.roles.length) {
      throw new ApiError(400, "One or more platform roles are invalid");
    }

    await prisma.$transaction(async (tx) => {
      await tx.platformUserRole.deleteMany({ where: { userId: user.id } });
      await tx.platformUserRole.createMany({
        data: roles.map((role) => ({
          userId: user.id,
          platformRoleId: role.id,
          assignedById: req.user!.id,
        })),
      });
    });

    await writeAudit({
      userId: req.user!.id,
      actorType: "platform",
      action: "CHANGE_PLATFORM_ROLES",
      entity: "user",
      entityId: user.id,
      resource: "platform.user.role",
      resourceId: user.id,
      metadata: { roles: data.roles },
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true });
  })
);

export default router;
