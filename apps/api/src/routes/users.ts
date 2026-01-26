import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { userCreateSchema, userUpdateSchema } from "../validators/userSchemas";
import { hashPassword } from "../utils/password";
import { ensureBaseRoles } from "../utils/roles";
import { ApiError } from "../utils/errors";
import { writeAudit } from "../utils/audit";
import { normalizeEmail } from "../utils/email";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const users = await prisma.user.findMany({
      where: { roles: { some: { tenantId } } },
      include: { roles: { where: { tenantId }, include: { role: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      users.map(
        (user: {
          id: string;
          name: string;
          email: string;
          isActive: boolean;
          roles: { role: { name: string } }[];
          createdAt: Date;
        }) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isActive: user.isActive,
          roles: user.roles.map((row: { role: { name: string } }) => row.role.name),
          createdAt: user.createdAt,
        })
      )
    );
  })
);

router.post(
  "/",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = userCreateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    await ensureBaseRoles();

    const normalizedEmail = normalizeEmail(data.email);
    const existing = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });
    if (existing) {
      throw new ApiError(409, "Email already registered");
    }

    const passwordHash = await hashPassword(data.password);

    const created = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash,
        roles: {
          create: data.roles.map((roleName) => ({
            role: { connect: { name: roleName } },
            tenantId,
          })),
        },
      },
      include: { roles: { include: { role: true } } },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "CREATE",
      entity: "user",
      entityId: created.id,
      after: {
        id: created.id,
        name: created.name,
        email: created.email,
        roles: created.roles.map((row: { role: { name: string } }) => row.role.name),
      },
      ip: req.ip,
    });

    res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email,
      roles: created.roles.map((row: { role: { name: string } }) => row.role.name),
    });
  })
);

router.patch(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = userUpdateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, roles: { some: { tenantId } } },
      include: { roles: { where: { tenantId }, include: { role: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const normalizedEmail = data.email ? normalizeEmail(data.email) : undefined;
    if (normalizedEmail) {
      const emailOwner = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      });
      if (emailOwner && emailOwner.id !== existing.id) {
        throw new ApiError(409, "Email already registered");
      }
    }

    const updateData: any = {
      name: data.name?.trim(),
      email: normalizedEmail,
      isActive: data.isActive,
    };

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { roles: { include: { role: true } } },
    });

    if (data.roles) {
      await ensureBaseRoles();
      const roles = await prisma.role.findMany({
        where: { name: { in: data.roles } },
      });
      if (roles.length !== data.roles.length) {
        throw new ApiError(400, "One or more roles are invalid");
      }
      await prisma.userRole.deleteMany({ where: { userId: updated.id, tenantId } });
      await prisma.userRole.createMany({
        data: roles.map((role: { id: string }) => ({
          userId: updated.id,
          roleId: role.id,
          tenantId,
        })),
      });
    }

    const fresh = await prisma.user.findFirst({
      where: { id: updated.id, roles: { some: { tenantId } } },
      include: { roles: { where: { tenantId }, include: { role: true } } },
    });

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "UPDATE",
      entity: "user",
      entityId: updated.id,
      before: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        isActive: existing.isActive,
        roles: existing.roles.map((row: { role: { name: string } }) => row.role.name),
      },
      after: {
        id: fresh!.id,
        name: fresh!.name,
        email: fresh!.email,
        isActive: fresh!.isActive,
        roles: fresh!.roles.map((row: { role: { name: string } }) => row.role.name),
      },
      ip: req.ip,
    });

    res.json({
      id: fresh!.id,
      name: fresh!.name,
      email: fresh!.email,
      isActive: fresh!.isActive,
      roles: fresh!.roles.map((row: { role: { name: string } }) => row.role.name),
    });
  })
);

router.delete(
  "/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const tenantId = req.user!.tenantId;
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, roles: { some: { tenantId } } },
      include: { roles: { where: { tenantId }, include: { role: true } } },
    });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    await prisma.userRole.deleteMany({ where: { userId: req.params.id, tenantId } });
    const remaining = await prisma.userRole.count({ where: { userId: req.params.id } });
    const updated =
      remaining === 0
        ? await prisma.user.update({
            where: { id: req.params.id },
            data: { isActive: false },
          })
        : existing;

    await writeAudit({
      userId: req.user?.id,
      tenantId,
      action: "REMOVE",
      entity: "user",
      entityId: existing.id,
      before: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        isActive: existing.isActive,
        roles: existing.roles.map((row: { role: { name: string } }) => row.role.name),
      },
      after: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        isActive: updated.isActive,
        removedFromTenant: tenantId,
      },
      ip: req.ip,
    });
    res.json({ success: true });
  })
);

router.get(
  "/roles",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (_req, res) => {
    await ensureBaseRoles();
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    res.json(roles);
  })
);

export default router;
