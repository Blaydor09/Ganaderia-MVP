import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { inviteCreateSchema, organizationUpdateSchema } from "../validators/organizationSchemas";
import { ApiError } from "../utils/errors";
import { generateInviteToken, hashInviteToken } from "../utils/invite";

const router = Router();

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const membersCount = await prisma.organizationMember.count({
      where: { organizationId, status: "ACTIVE" },
    });

    res.json({ ...organization, membersCount });
  })
);

router.patch(
  "/me",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const data = organizationUpdateSchema.parse(req.body);
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: { name: data.name?.trim() },
    });
    res.json(updated);
  })
);

router.get(
  "/members",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { include: { roles: { include: { role: true } } } } },
      orderBy: { createdAt: "asc" },
    });

    const items = members.map((member) => ({
      id: member.id,
      status: member.status,
      user: {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        isActive: member.user.isActive,
        roles: member.user.roles.map((row) => row.role.name),
        createdAt: member.user.createdAt,
      },
    }));

    res.json({ items });
  })
);

router.get(
  "/invites",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const invites = await prisma.organizationInvite.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items: invites });
  })
);

router.post(
  "/invites",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const data = inviteCreateSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.organizationId === organizationId) {
      throw new ApiError(409, "User already belongs to this organization");
    }

    if (existingUser && existingUser.organizationId !== organizationId) {
      throw new ApiError(409, "User already belongs to another organization");
    }

    await prisma.organizationInvite.updateMany({
      where: {
        organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId,
        email,
        role: data.role,
        tokenHash,
        expiresAt,
        createdBy: req.user?.id,
      },
    });

    const origin = req.headers.origin ?? "http://localhost:5173";
    const inviteUrl = `${origin}/invite?token=${token}`;

    res.status(201).json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      inviteToken: token,
      inviteUrl,
    });
  })
);

router.delete(
  "/invites/:id",
  authenticate,
  requireRoles("ADMIN"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const invite = await prisma.organizationInvite.findFirst({
      where: { id: req.params.id, organizationId },
    });
    if (!invite) {
      return res.status(404).json({ message: "Invite not found" });
    }
    if (invite.acceptedAt) {
      throw new ApiError(400, "Invite already accepted");
    }
    const updated = await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });
    res.json(updated);
  })
);

export default router;
