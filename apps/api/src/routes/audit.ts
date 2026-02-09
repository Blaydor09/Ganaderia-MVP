import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requireRoles } from "../middleware/rbac";
import { getPagination } from "../utils/pagination";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRoles("ADMIN", "AUDITOR"),
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const tenantId = req.user!.tenantId;
    const where: Record<string, unknown> = { tenantId };
    if (typeof req.query.action === "string" && req.query.action.trim()) {
      where.action = { contains: req.query.action.trim(), mode: "insensitive" };
    }
    if (typeof req.query.actorUserId === "string" && req.query.actorUserId.trim()) {
      where.actorUserId = req.query.actorUserId.trim();
    }
    if (typeof req.query.from === "string" || typeof req.query.to === "string") {
      where.occurredAt = {};
      if (typeof req.query.from === "string") {
        (where.occurredAt as Record<string, unknown>).gte = new Date(req.query.from);
      }
      if (typeof req.query.to === "string") {
        (where.occurredAt as Record<string, unknown>).lte = new Date(req.query.to);
      }
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { occurredAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

export default router;
