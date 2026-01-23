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
    const organizationId = req.user!.organizationId;
    const { page, pageSize, skip } = getPagination(req.query as Record<string, string>);
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { organizationId },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where: { organizationId } }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

export default router;
