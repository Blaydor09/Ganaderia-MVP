import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { userCreateSchema, userUpdateSchema } from "../validators/userSchemas";
import { hashPassword } from "../utils/password";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { roles: { include: { role: true } } },
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
    const passwordHash = await hashPassword(data.password);

    const created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        roles: {
          create: data.roles.map((roleName) => ({
            role: { connect: { name: roleName } },
          })),
        },
      },
      include: { roles: { include: { role: true } } },
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

    const updateData: any = {
      name: data.name,
      email: data.email,
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
      const roles = await prisma.role.findMany({
        where: { name: { in: data.roles } },
      });
      await prisma.userRole.deleteMany({ where: { userId: updated.id } });
      await prisma.userRole.createMany({
        data: roles.map((role: { id: string }) => ({
          userId: updated.id,
          roleId: role.id,
        })),
      });
    }

    const fresh = await prisma.user.findUnique({
      where: { id: updated.id },
      include: { roles: { include: { role: true } } },
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
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  })
);

router.get(
  "/roles",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (_req, res) => {
    const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
    res.json(roles);
  })
);

export default router;
