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
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { tenantId },
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where: { tenantId } }),
    ]);

    res.json({ items, total, page, pageSize });
  })
);

export default router;
